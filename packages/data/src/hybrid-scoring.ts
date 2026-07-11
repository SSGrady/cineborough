import type { DcMetroGeoJson, DcMetroFeatureProperties, ZipMetrics } from "./types";
import { featurePropertiesToZipMetrics } from "./dc-metro-geojson";

/** User criteria for hybrid neighborhood discovery — E007 step A */
export interface DiscoveryCriteria {
  budgetMin: number;
  budgetMax: number;
  minCapRate: number;
  maxOvervaluationPct: number;
  minWalkability: number;
  minRemoteWorkPct: number;
}

export const DISCOVERY_CRITERIA_STORAGE_KEY = "cineborough:discovery-criteria";

export const DEFAULT_DISCOVERY_CRITERIA: DiscoveryCriteria = {
  budgetMin: 400_000,
  budgetMax: 900_000,
  minCapRate: 4.0,
  maxOvervaluationPct: 25,
  minWalkability: 70,
  minRemoteWorkPct: 25,
};

export interface ScoreBreakdown {
  capRate: number;
  overvaluation: number;
  walkability: number;
  remoteWork: number;
  forecast: number;
  composite: number;
}

export interface RankedNeighborhood {
  zip: string;
  name: string;
  state: string;
  score: number;
  rank: number;
  center: [number, number];
  breakdown: ScoreBreakdown;
  metrics: ZipMetrics;
  passedFilters: boolean;
  filterReasons: string[];
}

const SCORE_WEIGHTS = {
  capRate: 0.25,
  overvaluation: 0.2,
  walkability: 0.2,
  remoteWork: 0.2,
  forecast: 0.15,
} as const;

function normalizeWithin(values: number[], higherIsBetter: boolean): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => {
    const t = (v - min) / (max - min);
    return (higherIsBetter ? t : 1 - t) * 100;
  });
}

function evaluateFilters(
  props: DcMetroFeatureProperties,
  criteria: DiscoveryCriteria,
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (props.medianHomeValue < criteria.budgetMin) {
    reasons.push(`Below budget min ($${criteria.budgetMin.toLocaleString()})`);
  }
  if (props.medianHomeValue > criteria.budgetMax) {
    reasons.push(`Above budget max ($${criteria.budgetMax.toLocaleString()})`);
  }
  if (props.capRatePct < criteria.minCapRate) {
    reasons.push(`Cap rate ${props.capRatePct}% below ${criteria.minCapRate}% floor`);
  }
  if (props.overvaluationPct > criteria.maxOvervaluationPct) {
    reasons.push(`Overvalued ${props.overvaluationPct}% above ${criteria.maxOvervaluationPct}% cap`);
  }
  if (props.walkScore < criteria.minWalkability) {
    reasons.push(`Walk score ${props.walkScore} below ${criteria.minWalkability} floor`);
  }
  if (props.remoteWorkPct < criteria.minRemoteWorkPct) {
    reasons.push(`Remote work ${props.remoteWorkPct}% below ${criteria.minRemoteWorkPct}% floor`);
  }

  return { passed: reasons.length === 0, reasons };
}

/**
 * Weighted hybrid rank across financial + hope-core metrics for sandbox ZIPs.
 * Uses live shard geojson properties (ADR-012 ingest).
 */
export function rankNeighborhoods(
  geoJson: DcMetroGeoJson,
  criteria: DiscoveryCriteria = DEFAULT_DISCOVERY_CRITERIA,
  topN = 3,
): RankedNeighborhood[] {
  const features = geoJson.features;

  const eligible = features
    .map((f) => {
      const filter = evaluateFilters(f.properties, criteria);
      return { feature: f, filter };
    })
    .filter(({ filter }) => filter.passed);

  if (eligible.length === 0) {
    return [];
  }

  const capRates = eligible.map(({ feature }) => feature.properties.capRatePct);
  const overvals = eligible.map(({ feature }) => feature.properties.overvaluationPct);
  const walks = eligible.map(({ feature }) => feature.properties.walkScore);
  const remotes = eligible.map(({ feature }) => feature.properties.remoteWorkPct);
  const forecasts = eligible.map(({ feature }) => feature.properties.oneYearForecastPct);

  const normCap = normalizeWithin(capRates, true);
  const normOver = normalizeWithin(overvals, false);
  const normWalk = normalizeWithin(walks, true);
  const normRemote = normalizeWithin(remotes, true);
  const normForecast = normalizeWithin(forecasts, true);

  const scored = eligible.map(({ feature }, i) => {
    const breakdown: ScoreBreakdown = {
      capRate: normCap[i],
      overvaluation: normOver[i],
      walkability: normWalk[i],
      remoteWork: normRemote[i],
      forecast: normForecast[i],
      composite: 0,
    };
    breakdown.composite =
      breakdown.capRate * SCORE_WEIGHTS.capRate +
      breakdown.overvaluation * SCORE_WEIGHTS.overvaluation +
      breakdown.walkability * SCORE_WEIGHTS.walkability +
      breakdown.remoteWork * SCORE_WEIGHTS.remoteWork +
      breakdown.forecast * SCORE_WEIGHTS.forecast;

    return buildRankedEntry(feature, breakdown.composite, breakdown);
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function isFiniteLngLat(coord: unknown): coord is [number, number] {
  return (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  );
}

function centroidFromGeometry(
  geometry: DcMetroGeoJson["features"][number]["geometry"],
): [number, number] | null {
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0]?.[0];
  if (!ring || ring.length < 3) return null;

  const n =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
  if (n <= 0) return null;

  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return [sumLng / n, sumLat / n];
}

function featureCenter(
  feature: DcMetroGeoJson["features"][number],
): [number, number] {
  const { labelLng, labelLat } = feature.properties;
  if (isFiniteLngLat([labelLng, labelLat])) {
    return [labelLng, labelLat];
  }
  return centroidFromGeometry(feature.geometry) ?? [-77.0369, 38.9072];
}

function buildRankedEntry(
  feature: DcMetroGeoJson["features"][number],
  composite: number,
  breakdown: ScoreBreakdown,
): RankedNeighborhood {
  const props = feature.properties;

  return {
    zip: props.zipCode,
    name: props.neighborhoodName,
    state: props.state,
    score: Math.round(composite * 10) / 10,
    rank: 0,
    center: featureCenter(feature),
    breakdown,
    metrics: featurePropertiesToZipMetrics(props),
    passedFilters: true,
    filterReasons: [],
  };
}
