/**
 * Regenerates data/mock/us-metros.geojson from Census CBSA boundaries + live ZHVI/FHFA overlay.
 * Run: pnpm --filter @cineborough/data build:us-metros
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeOpportunityScore, normalizeScores } from "./opportunity-index.ts";
import {
  buildBaselineFromBoundary,
  mergeMetroLiveMetrics,
  computeMetroOpportunityScore,
  type MetroMetricBaseline,
} from "./ingest/merge-metro-live-metrics.ts";
import type {
  DcMetroFeature,
  DcMetroFeatureProperties,
  DcMetroGeoJson,
  MetroGeometry,
} from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const OUTPUT = resolve(DATA_DIR, "us-metros.geojson");
const BOUNDARIES = resolve(DATA_DIR, "cbsa-boundaries-20m.geojson");
const MOCK_METRICS = resolve(DATA_DIR, "us-metro-metrics.json");

interface CbsaBoundaryFeature {
  type: "Feature";
  properties: {
    GEOID: string;
    CBSAFP: string;
    NAME: string;
  };
  geometry: MetroGeometry;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function colorForNormalizedScore(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 70) return "#22c55e";
  if (clamped >= 40) return "#eab308";
  return "#ef4444";
}

function shortMetroName(name: string, state: string): string {
  const base = name.split(",")[0].trim();
  return state && state.length <= 2 ? `${base}, ${state}` : base;
}

function polygonCentroid(geometry: MetroGeometry): { lng: number; lat: number } {
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0]?.[0];
  if (!ring || ring.length === 0) return { lng: -96.5, lat: 39.2 };
  let sumLng = 0;
  let sumLat = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return { lng: sumLng / n, lat: sumLat / n };
}

function buildFeature(
  metro: MetroMetricBaseline,
  geometry: MetroGeometry,
  opportunityScore: number,
  opportunityScoreNormalized: number,
): DcMetroFeature {
  const fillColor = colorForNormalizedScore(opportunityScoreNormalized);
  const label = shortMetroName(metro.name, metro.state);
  const centroid = polygonCentroid(geometry);

  const properties: DcMetroFeatureProperties = {
    zipCode: metro.cbsa,
    neighborhoodName: label,
    state: metro.state,
    medianHomeValue: metro.medianHomeValue,
    oneYearForecastPct: metro.homePriceForecast1yr,
    overvaluationPct: metro.overvaluationPct,
    capRatePct: metro.capRate,
    daysOnMarket: metro.daysOnMarket,
    sellerDesperationScore: metro.sellerDesperationScore,
    marketPsf: metro.marketPsf,
    homeValueGrowthYoy: metro.homeValueGrowthYoy,
    priceCutCount: 0,
    remoteWorkPct: metro.remoteWorkPct,
    homeowners25to44Pct: metro.homeowners25to44Pct,
    populationGrowthRate: metro.populationGrowthRate,
    medianAge: metro.medianAge,
    walkScore: metro.walkabilityScore,
    collegeDegreeRate: metro.collegeDegreeRate,
    localQuote: "",
    primaryVibe: metro.name,
    opportunityScore,
    opportunityScoreNormalized: Math.round(opportunityScoreNormalized * 10) / 10,
    fillColor,
    fillColorRgb: hexToRgb(fillColor),
    labelLng: Math.round((metro.lng || centroid.lng) * 1e6) / 1e6,
    labelLat: Math.round((metro.lat || centroid.lat) * 1e6) / 1e6,
  };

  return { type: "Feature", properties, geometry };
}

function buildUsMetrosGeoJson(): DcMetroGeoJson {
  const boundaries = JSON.parse(readFileSync(BOUNDARIES, "utf8")) as {
    features: CbsaBoundaryFeature[];
  };

  const mockSource = JSON.parse(readFileSync(MOCK_METRICS, "utf8")) as {
    updatedAt: string;
    metros: MetroMetricBaseline[];
  };
  const mockByCbsa = new Map(mockSource.metros.map((m) => [m.cbsa, m]));

  const mergedRows = boundaries.features.map((feature) => {
    const cbsa = feature.properties.GEOID ?? feature.properties.CBSAFP;
    const mock = mockByCbsa.get(cbsa);
    const centroid = polygonCentroid(feature.geometry);
    const baseline = buildBaselineFromBoundary(
      cbsa,
      feature.properties.NAME,
      mock?.lng ?? centroid.lng,
      mock?.lat ?? centroid.lat,
      mock,
    );
    return mergeMetroLiveMetrics(baseline);
  });

  const rawScores = mergedRows.map((m) =>
    computeOpportunityScore({
      homePriceForecast1yr: m.homePriceForecast1yr,
      overvaluationPct: m.overvaluationPct,
      remoteWorkPct: m.remoteWorkPct,
    }),
  );
  const normalized = normalizeScores(rawScores);

  const features: DcMetroFeature[] = boundaries.features.map((feature, i) => {
    const geometry = feature.geometry;
    return buildFeature(mergedRows[i], geometry, rawScores[i], normalized[i]);
  });

  const zhviLive = mergedRows.filter((m) => m.liveSources.zhvi).length;
  const derivedLive = mergedRows.filter((m) => m.liveSources.derivedForecast).length;

  console.info(
    `Live overlay: ${zhviLive}/${features.length} ZHVI, ${derivedLive} derived forecast`,
  );

  return {
    type: "FeatureCollection",
    metadata: {
      metro: "United States",
      dataAsOf: mockSource.updatedAt,
      dataAsOfLabel: `ZHVI+FHFA live (${zhviLive}/${features.length} metros) · ACS sandbox ZIPs · mock cap/DOM/PSF/walk`,
      sandboxZips: [],
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    features,
  };
}

const collection = buildUsMetrosGeoJson();
writeFileSync(OUTPUT, `${JSON.stringify(collection)}\n`, "utf8");
console.info(`Wrote ${OUTPUT} (${collection.features.length} CBSA metros)`);
