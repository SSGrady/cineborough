import { featurePropertiesToZipMetrics, getRawMetricFromFeature } from "./dc-metro-geojson";
import type {
  DcMetroGeoJson,
  DcMetroFeatureProperties,
  MetricLayerKey,
  ZipMetrics,
} from "./types";
import { METRIC_LAYERS } from "./types";

/** Metrics available as discovery filters (excludes composite opportunity score and hidden metrics). */
export type DiscoveryFilterMetric = Exclude<
  MetricLayerKey,
  "opportunityScore" | "incomeGrowthRate"
>;

export type DiscoveryFilterKind = "range" | "min" | "max";

export interface DiscoveryMetricDef {
  metric: DiscoveryFilterMetric;
  kind: DiscoveryFilterKind;
  higherIsBetter: boolean;
  defaultMin?: number;
  defaultMax?: number;
  step: number;
}

export interface DiscoveryFilter {
  id: string;
  metric: DiscoveryFilterMetric;
  min?: number;
  max?: number;
}

/** User criteria for hybrid neighborhood discovery — dynamic add/remove filters. */
export interface DiscoveryCriteria {
  filters: DiscoveryFilter[];
}

export const DISCOVERY_CRITERIA_STORAGE_KEY = "cineborough:discovery-criteria";
export const DISCOVERY_CRITERIA_STORAGE_VERSION = 2;

const METRIC_FILTER_KIND: Record<
  DiscoveryFilterMetric,
  Omit<DiscoveryMetricDef, "metric">
> = {
  medianHomeValue: {
    kind: "range",
    higherIsBetter: false,
    defaultMin: 300_000,
    defaultMax: 1_500_000,
    step: 10_000,
  },
  homePriceForecast1yr: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 0,
    step: 0.5,
  },
  overvaluationPct: {
    kind: "max",
    higherIsBetter: false,
    defaultMax: 40,
    step: 0.5,
  },
  capRate: { kind: "min", higherIsBetter: true, defaultMin: 2.5, step: 0.1 },
  daysOnMarket: { kind: "max", higherIsBetter: false, defaultMax: 60, step: 1 },
  sellerDesperationScore: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 30,
    step: 1,
  },
  marketPsf: { kind: "min", higherIsBetter: true, defaultMin: 100, step: 5 },
  homeValueGrowthYoy: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 0,
    step: 0.5,
  },
  remoteWorkPct: { kind: "min", higherIsBetter: true, defaultMin: 15, step: 0.5 },
  homeowners25to44Pct: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 20,
    step: 0.5,
  },
  populationGrowthRate: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 0,
    step: 0.5,
  },
  medianAge: { kind: "max", higherIsBetter: false, defaultMax: 45, step: 1 },
  collegeDegreeRate: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 30,
    step: 0.5,
  },
  walkabilityScore: {
    kind: "min",
    higherIsBetter: true,
    defaultMin: 35,
    step: 1,
  },
};

export const DISCOVERY_FILTER_METRICS: DiscoveryFilterMetric[] = Object.keys(
  METRIC_FILTER_KIND,
) as DiscoveryFilterMetric[];

/** Permissive hope-core defaults — no financial hard filters. */
export const DEFAULT_DISCOVERY_CRITERIA: DiscoveryCriteria = {
  filters: [
    { id: "default-walk", metric: "walkabilityScore", min: 0 },
    { id: "default-forecast", metric: "homePriceForecast1yr", min: -100 },
  ],
};

const FALLBACK_SCORING_METRICS: DiscoveryFilterMetric[] = [
  "walkabilityScore",
  "homePriceForecast1yr",
];

export function getDiscoveryMetricDef(metric: DiscoveryFilterMetric): DiscoveryMetricDef {
  return { metric, ...METRIC_FILTER_KIND[metric] };
}

export function getDiscoveryMetricLabel(metric: DiscoveryFilterMetric): string {
  return METRIC_LAYERS.find((m) => m.key === metric)?.label ?? metric;
}

export function getDiscoveryMetricUnit(metric: DiscoveryFilterMetric): string {
  return METRIC_LAYERS.find((m) => m.key === metric)?.unit ?? "";
}

export function createDiscoveryFilter(metric: DiscoveryFilterMetric, id?: string): DiscoveryFilter {
  const def = getDiscoveryMetricDef(metric);
  const filter: DiscoveryFilter = {
    id: id ?? `${metric}-${Date.now()}`,
    metric,
  };
  if (def.kind === "range" || def.kind === "min") {
    filter.min = def.defaultMin;
  }
  if (def.kind === "range" || def.kind === "max") {
    filter.max = def.defaultMax;
  }
  return filter;
}

function normalizeFilters(filters: DiscoveryFilter[]): DiscoveryFilter[] {
  return [...filters]
    .map((f) => ({
      id: f.id,
      metric: f.metric,
      ...(f.min !== undefined ? { min: f.min } : {}),
      ...(f.max !== undefined ? { max: f.max } : {}),
    }))
    .sort((a, b) => a.metric.localeCompare(b.metric) || a.id.localeCompare(b.id));
}

export function discoveryCriteriaEqual(a: DiscoveryCriteria, b: DiscoveryCriteria): boolean {
  return JSON.stringify(normalizeFilters(a.filters)) === JSON.stringify(normalizeFilters(b.filters));
}

/** Default criteria for a sandbox CBSA — same permissive hope-core set for all sandboxes. */
export function discoveryCriteriaForSandbox(_cbsaCode: string): DiscoveryCriteria {
  return DEFAULT_DISCOVERY_CRITERIA;
}

export interface ScoreBreakdown {
  byMetric: Partial<Record<DiscoveryFilterMetric, number>>;
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

function formatFilterValue(metric: DiscoveryFilterMetric, value: number): string {
  if (metric === "medianHomeValue") return `$${value.toLocaleString()}`;
  const unit = getDiscoveryMetricUnit(metric);
  if (unit === "%") return `${value}%`;
  if (unit === "$") return `$${value.toLocaleString()}`;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function evaluateFilters(
  props: DcMetroFeatureProperties,
  criteria: DiscoveryCriteria,
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const filter of criteria.filters) {
    const value = getRawMetricFromFeature(props, filter.metric);
    const label = getDiscoveryMetricLabel(filter.metric);

    if (filter.min !== undefined && value < filter.min) {
      reasons.push(
        `${label} ${formatFilterValue(filter.metric, value)} below ${formatFilterValue(filter.metric, filter.min)} floor`,
      );
    }
    if (filter.max !== undefined && value > filter.max) {
      reasons.push(
        `${label} ${formatFilterValue(filter.metric, value)} above ${formatFilterValue(filter.metric, filter.max)} cap`,
      );
    }
  }

  return { passed: reasons.length === 0, reasons };
}

function scoringMetricsForCriteria(criteria: DiscoveryCriteria): DiscoveryFilterMetric[] {
  if (criteria.filters.length > 0) {
    return criteria.filters.map((f) => f.metric);
  }
  return FALLBACK_SCORING_METRICS;
}

/**
 * Weighted hybrid rank across active user criteria for sandbox ZIPs.
 * Hard filters and scoring weights follow the same dynamic filter set.
 */
export function rankNeighborhoods(
  geoJson: DcMetroGeoJson,
  criteria: DiscoveryCriteria = DEFAULT_DISCOVERY_CRITERIA,
  topN = 3,
): RankedNeighborhood[] {
  const features = geoJson.features;
  const scoringMetrics = scoringMetricsForCriteria(criteria);

  const eligible = features
    .map((f) => {
      const filter = evaluateFilters(f.properties, criteria);
      return { feature: f, filter };
    })
    .filter(({ filter }) => filter.passed);

  if (eligible.length === 0) {
    return [];
  }

  const normalizedByMetric = new Map<DiscoveryFilterMetric, number[]>();
  for (const metric of scoringMetrics) {
    const def = getDiscoveryMetricDef(metric);
    const raw = eligible.map(({ feature }) =>
      getRawMetricFromFeature(feature.properties, metric),
    );
    normalizedByMetric.set(metric, normalizeWithin(raw, def.higherIsBetter));
  }

  const weight = scoringMetrics.length > 0 ? 1 / scoringMetrics.length : 1;

  const scored = eligible.map(({ feature }, i) => {
    const byMetric: Partial<Record<DiscoveryFilterMetric, number>> = {};
    let composite = 0;

    for (const metric of scoringMetrics) {
      const norm = normalizedByMetric.get(metric)?.[i] ?? 0;
      byMetric[metric] = norm;
      composite += norm * weight;
    }

    const breakdown: ScoreBreakdown = { byMetric, composite: 0 };
    breakdown.composite = composite;

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
