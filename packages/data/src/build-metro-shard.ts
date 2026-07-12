import { computeOpportunityScore, normalizeScores } from "./opportunity-index.ts";
import type { ZipMetricsInput } from "./validation.ts";
import type { DcMetroFeature, DcMetroFeatureProperties, DcMetroGeoJson, MetroGeometry } from "./types.ts";

export interface MetroShardBuildInput {
  metro: string;
  cbsaCode: string;
  dataAsOf?: string;
  dataAsOfLabel?: string;
  zips: ZipMetricsInput[];
  boundaries: {
    features: Array<{
      type: "Feature";
      properties: { zip: string; name: string };
      geometry: MetroGeometry;
    }>;
  };
  quotes: { quotes: Array<{ zip: string; text: string; primaryVibe?: string }> };
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

function exteriorRing(geometry: MetroGeometry): number[][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ?? [];
  }
  const polygons = geometry.coordinates;
  let best: number[][] = [];
  for (const poly of polygons) {
    const ring = poly[0] ?? [];
    if (ring.length > best.length) best = ring;
  }
  return best;
}

function polygonCentroid(geometry: MetroGeometry): { lng: number; lat: number } {
  const ring = exteriorRing(geometry);
  let sumLng = 0;
  let sumLat = 0;
  const n = Math.max(ring.length - 1, 0);
  if (n === 0) return { lng: 0, lat: 0 };
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return { lng: sumLng / n, lat: sumLat / n };
}

function buildFeature(
  zip: ZipMetricsInput,
  geometry: MetroGeometry,
  opportunityScore: number,
  opportunityScoreNormalized: number,
  quote?: { text: string; primaryVibe?: string },
): DcMetroFeature {
  const fillColor = colorForNormalizedScore(opportunityScoreNormalized);
  const centroid = polygonCentroid(geometry);

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
    incomeGrowthRate: zip.incomeGrowthRate,
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

export function buildMetroShardGeoJson(input: MetroShardBuildInput): DcMetroGeoJson {
  const zips = input.zips;
  const rawScores = zips.map((z) => computeOpportunityScore(z));
  const normalized = normalizeScores(rawScores);

  const features: DcMetroFeature[] = zips.map((zip, i) => {
    const boundary = input.boundaries.features.find((f) => f.properties.zip === zip.zip);
    if (!boundary) {
      throw new Error(`Missing boundary for ZIP ${zip.zip}`);
    }
    const quote = input.quotes.quotes.find((q) => q.zip === zip.zip);
    return buildFeature(zip, boundary.geometry, rawScores[i], normalized[i], quote);
  });

  return {
    type: "FeatureCollection",
    metadata: {
      metro: input.metro,
      cbsaCode: input.cbsaCode,
      dataAsOf: input.dataAsOf ?? "2026-05-01",
      dataAsOfLabel: input.dataAsOfLabel ?? "May 2026",
      sandboxZips: zips.map((z) => z.zip),
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    features,
  };
}
