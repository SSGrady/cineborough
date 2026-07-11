/**
 * Regenerates data/mock/us-metros.geojson from Census CBSA boundaries + metrics.
 * Run: pnpm --filter @cineborough/data build:us-metros
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeOpportunityScore, normalizeScores } from "./opportunity-index.ts";
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

interface MetroInput {
  cbsa: string;
  name: string;
  state: string;
  lng: number;
  lat: number;
  tier: 1 | 2 | 3;
  medianHomeValue: number;
  homePriceForecast1yr: number;
  overvaluationPct: number;
  capRate: number;
  daysOnMarket: number;
  sellerDesperationScore: number;
  marketPsf: number;
  homeValueGrowthYoy: number;
  remoteWorkPct: number;
  homeowners25to44Pct: number;
  populationGrowthRate: number;
  medianAge: number;
  walkabilityScore: number;
  collegeDegreeRate: number;
}

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
  const city = name.split("-")[0].split(",")[0].trim();
  return `${city}, ${state}`;
}

function buildFeature(
  metro: MetroInput,
  geometry: MetroGeometry,
  opportunityScore: number,
  opportunityScoreNormalized: number,
): DcMetroFeature {
  const fillColor = colorForNormalizedScore(opportunityScoreNormalized);
  const label = shortMetroName(metro.name, metro.state);

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
    labelLng: Math.round(metro.lng * 1e6) / 1e6,
    labelLat: Math.round(metro.lat * 1e6) / 1e6,
  };

  return { type: "Feature", properties, geometry };
}

function loadBoundaryIndex(): Map<string, MetroGeometry> {
  const source = JSON.parse(readFileSync(BOUNDARIES, "utf8")) as {
    features: CbsaBoundaryFeature[];
  };

  const index = new Map<string, MetroGeometry>();
  for (const feature of source.features) {
    const code = feature.properties.GEOID ?? feature.properties.CBSAFP;
    if (code) index.set(code, feature.geometry);
  }
  return index;
}

function buildUsMetrosGeoJson(): DcMetroGeoJson {
  const source = JSON.parse(
    readFileSync(resolve(DATA_DIR, "us-metro-metrics.json"), "utf8"),
  ) as { updatedAt: string; metros: MetroInput[] };

  const boundaries = loadBoundaryIndex();
  const rawScores = source.metros.map((m) =>
    computeOpportunityScore({
      homePriceForecast1yr: m.homePriceForecast1yr,
      overvaluationPct: m.overvaluationPct,
      remoteWorkPct: m.remoteWorkPct,
    }),
  );
  const normalized = normalizeScores(rawScores);

  const features: DcMetroFeature[] = [];
  const missing: string[] = [];

  for (let i = 0; i < source.metros.length; i++) {
    const metro = source.metros[i];
    const geometry = boundaries.get(metro.cbsa);
    if (!geometry) {
      missing.push(`${metro.cbsa} (${metro.name})`);
      continue;
    }
    features.push(buildFeature(metro, geometry, rawScores[i], normalized[i]));
  }

  if (missing.length > 0) {
    console.warn(`Missing CBSA boundaries for ${missing.length} metros:\n  ${missing.join("\n  ")}`);
  }

  return {
    type: "FeatureCollection",
    metadata: {
      metro: "United States",
      dataAsOf: source.updatedAt,
      dataAsOfLabel: "May 2026",
      sandboxZips: [],
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    features,
  };
}

const collection = buildUsMetrosGeoJson();
writeFileSync(OUTPUT, `${JSON.stringify(collection)}\n`, "utf8");
console.info(`Wrote ${OUTPUT} (${collection.features.length} CBSA metros)`);
