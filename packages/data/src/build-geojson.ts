/**
 * Regenerates data/mock/dc-metro.geojson from boundaries, metrics, and locale quotes.
 * Run: pnpm --filter @cineborough/data build:geojson
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeOpportunityScore, normalizeScores } from "./opportunity-index";
import type { ZipMetricsInput } from "./validation";
import type { DcMetroFeature, DcMetroFeatureProperties, DcMetroGeoJson, PolygonGeometry } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const OUTPUT = resolve(DATA_DIR, "dc-metro.geojson");

const boundaries = JSON.parse(
  readFileSync(resolve(DATA_DIR, "zip-boundaries.geojson"), "utf8"),
) as { features: Array<{ type: "Feature"; properties: { zip: string; name: string }; geometry: PolygonGeometry }> };

const metrics = JSON.parse(
  readFileSync(resolve(DATA_DIR, "zip-metrics.json"), "utf8"),
) as { metro: string; zips: ZipMetricsInput[] };

const localeQuotes = JSON.parse(
  readFileSync(resolve(DATA_DIR, "locale-quotes.json"), "utf8"),
) as { quotes: Array<{ zip: string; text: string; primaryVibe?: string }> };

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

function polygonCentroid(coordinates: number[][][]): { lng: number; lat: number } {
  const ring = coordinates[0];
  let sumLng = 0;
  let sumLat = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return { lng: sumLng / n, lat: sumLat / n };
}

function quoteForZip(zip: string) {
  return localeQuotes.quotes.find((q) => q.zip === zip);
}

function buildFeature(
  zip: ZipMetricsInput,
  geometry: PolygonGeometry,
  opportunityScore: number,
  opportunityScoreNormalized: number,
): DcMetroFeature {
  const quote = quoteForZip(zip.zip);
  const fillColor = colorForNormalizedScore(opportunityScoreNormalized);
  const centroid = polygonCentroid(geometry.coordinates as number[][][]);

  const properties: DcMetroFeatureProperties = {
    zipCode: zip.zip,
    neighborhoodName: zip.name,
    state: zip.state,
    medianHomeValue: zip.medianHomeValue,
    oneYearForecastPct: zip.homePriceForecast1yr,
    overvaluationPct: zip.overvaluationPct,
    capRatePct: zip.capRate,
    daysOnMarket: zip.daysOnMarket,
    sellerDesperationScore: zip.sellerDesperationScore,
    marketPsf: zip.marketPsf,
    homeValueGrowthYoy: zip.homeValueGrowthYoy,
    priceCutCount: zip.priceCutCount ?? 0,
    remoteWorkPct: zip.remoteWorkPct,
    homeowners25to44Pct: zip.homeowners25to44Pct,
    populationGrowthRate: zip.populationGrowthRate,
    medianAge: zip.medianAge,
    walkScore: zip.walkabilityScore,
    collegeDegreeRate: zip.collegeDegreeRate,
    localQuote: quote?.text ?? "",
    primaryVibe: quote?.primaryVibe ?? zip.name,
    opportunityScore,
    opportunityScoreNormalized: Math.round(opportunityScoreNormalized * 10) / 10,
    fillColor,
    fillColorRgb: hexToRgb(fillColor),
    labelLng: Math.round(centroid.lng * 1e6) / 1e6,
    labelLat: Math.round(centroid.lat * 1e6) / 1e6,
  };

  return { type: "Feature", properties, geometry };
}

function buildDcMetroGeoJson(): DcMetroGeoJson {
  const zips = metrics.zips as ZipMetricsInput[];
  const rawScores = zips.map((z) => computeOpportunityScore(z));
  const normalized = normalizeScores(rawScores);

  const boundaryFeatures = boundaries.features as Array<{
    type: "Feature";
    properties: { zip: string; name: string };
    geometry: PolygonGeometry;
  }>;

  const features: DcMetroFeature[] = zips.map((zip, i) => {
    const boundary = boundaryFeatures.find((f) => f.properties.zip === zip.zip);
    if (!boundary) {
      throw new Error(`Missing boundary for ZIP ${zip.zip}`);
    }
    return buildFeature(zip, boundary.geometry, rawScores[i], normalized[i]);
  });

  return {
    type: "FeatureCollection",
    metadata: {
      metro: metrics.metro,
      dataAsOf: "2026-05-01",
      dataAsOfLabel: "May 2026",
      sandboxZips: zips.map((z) => z.zip),
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    features,
  };
}

const collection = buildDcMetroGeoJson();
writeFileSync(OUTPUT, `${JSON.stringify(collection)}\n`, "utf8");
console.info(`Wrote ${OUTPUT} (${collection.features.length} features)`);
