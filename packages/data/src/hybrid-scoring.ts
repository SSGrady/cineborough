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

/** Minimum match % to count as a qualifying neighborhood (Where Might I Live–style partial matches). */
export const DISCOVERY_MATCH_THRESHOLD = 40;

/** Default number of top neighborhoods returned by discovery. */
export const DEFAULT_DISCOVERY_TOP_N = 10;

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
  /** Weighted criteria match percentage (0–100). Primary discovery rank key. */
  matchPercent: number;
  /** Display score — equals matchPercent when filters are active, else relative metro rank. */
  score: number;
  rank: number;
  center: [number, number];
  breakdown: ScoreBreakdown;
  metrics: ZipMetrics;
  /** True when every active criterion scores 100% (perfect match). */
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

/**
 * Per-criterion partial match (0–100).
 * 100 = inside target; linear decay outside over a soft margin (~50% of target span).
 */
function criterionMatchScore(
  value: number,
  filter: DiscoveryFilter,
  def: DiscoveryMetricDef,
): number {
  if (def.kind === "min" && filter.min !== undefined) {
    const target = filter.min;
    if (value >= target) return 100;
    const margin = Math.max(Math.abs(target) * 0.5, 1);
    return Math.max(0, 100 * (1 - (target - value) / margin));
  }

  if (def.kind === "max" && filter.max !== undefined) {
    const target = filter.max;
    if (value <= target) return 100;
    const margin = Math.max(Math.abs(target) * 0.5, 1);
    return Math.max(0, 100 * (1 - (value - target) / margin));
  }

  if (def.kind === "range") {
    const min = filter.min ?? 0;
    const max = filter.max ?? min;
    if (value >= min && value <= max) return 100;

    const span = Math.max(max - min, 1);
    const margin = span * 0.5;

    if (value < min) {
      return Math.max(0, 100 * (1 - (min - value) / margin));
    }
    return Math.max(0, 100 * (1 - (value - max) / margin));
  }

  return 100;
}

function describeCriterionGap(
  metric: DiscoveryFilterMetric,
  value: number,
  filter: DiscoveryFilter,
  criterionScore: number,
): string | null {
  if (criterionScore >= 100) return null;

  const label = getDiscoveryMetricLabel(metric);
  const formatted = formatFilterValue(metric, value);

  if (filter.min !== undefined && filter.max !== undefined) {
    return `${label} ${formatted} outside ${formatFilterValue(metric, filter.min)}–${formatFilterValue(metric, filter.max)} (${Math.round(criterionScore)}% match)`;
  }
  if (filter.min !== undefined) {
    return `${label} ${formatted} below ${formatFilterValue(metric, filter.min)} target (${Math.round(criterionScore)}% match)`;
  }
  if (filter.max !== undefined) {
    return `${label} ${formatted} above ${formatFilterValue(metric, filter.max)} cap (${Math.round(criterionScore)}% match)`;
  }
  return null;
}

function computeMatchBreakdown(
  props: DcMetroFeatureProperties,
  criteria: DiscoveryCriteria,
): {
  matchPercent: number;
  byMetric: Partial<Record<DiscoveryFilterMetric, number>>;
  passedFilters: boolean;
  filterReasons: string[];
} {
  if (criteria.filters.length === 0) {
    return { matchPercent: 100, byMetric: {}, passedFilters: true, filterReasons: [] };
  }

  const byMetric: Partial<Record<DiscoveryFilterMetric, number>> = {};
  const filterReasons: string[] = [];
  let sum = 0;
  let allPerfect = true;

  for (const filter of criteria.filters) {
    const value = getRawMetricFromFeature(props, filter.metric);
    const def = getDiscoveryMetricDef(filter.metric);
    const raw = criterionMatchScore(value, filter, def);
    const rounded = Math.round(raw * 10) / 10;
    byMetric[filter.metric] = rounded;
    sum += raw;
    if (raw < 100) allPerfect = false;

    const reason = describeCriterionGap(filter.metric, value, filter, raw);
    if (reason) filterReasons.push(reason);
  }

  const matchPercent = Math.round((sum / criteria.filters.length) * 10) / 10;
  return { matchPercent, byMetric, passedFilters: allPerfect, filterReasons };
}

/** Count ZIPs whose weighted match % meets the discovery threshold. */
export function countMatchingNeighborhoods(
  geoJson: DcMetroGeoJson,
  criteria: DiscoveryCriteria = DEFAULT_DISCOVERY_CRITERIA,
  threshold = DISCOVERY_MATCH_THRESHOLD,
): number {
  return geoJson.features.filter((f) => {
    const { matchPercent } = computeMatchBreakdown(f.properties, criteria);
    return matchPercent >= threshold;
  }).length;
}

function scoringMetricsForCriteria(criteria: DiscoveryCriteria): DiscoveryFilterMetric[] {
  if (criteria.filters.length > 0) {
    return criteria.filters.map((f) => f.metric);
  }
  return FALLBACK_SCORING_METRICS;
}

/**
 * Rank sandbox ZIPs by weighted criteria match % (partial matches included).
 * Each active filter contributes equally; score decays linearly outside the target range.
 */
export function rankNeighborhoods(
  geoJson: DcMetroGeoJson,
  criteria: DiscoveryCriteria = DEFAULT_DISCOVERY_CRITERIA,
  topN = DEFAULT_DISCOVERY_TOP_N,
): RankedNeighborhood[] {
  const features = geoJson.features;
  const hasActiveFilters = criteria.filters.length > 0;
  const scoringMetrics = scoringMetricsForCriteria(criteria);

  const normalizedByMetric = new Map<DiscoveryFilterMetric, number[]>();
  if (!hasActiveFilters) {
    for (const metric of scoringMetrics) {
      const def = getDiscoveryMetricDef(metric);
      const raw = features.map((f) => getRawMetricFromFeature(f.properties, metric));
      normalizedByMetric.set(metric, normalizeWithin(raw, def.higherIsBetter));
    }
  }

  const scored = features.map((feature, featureIndex) => {
    const match = computeMatchBreakdown(feature.properties, criteria);

    if (hasActiveFilters) {
      const breakdown: ScoreBreakdown = {
        byMetric: match.byMetric,
        composite: match.matchPercent,
      };
      return buildRankedEntry(feature, match.matchPercent, match.matchPercent, breakdown, match);
    }

    const weight = 1 / scoringMetrics.length;
    let composite = 0;
    const byMetric: Partial<Record<DiscoveryFilterMetric, number>> = {};
    for (const metric of scoringMetrics) {
      const norm = normalizedByMetric.get(metric)?.[featureIndex] ?? 0;
      byMetric[metric] = norm;
      composite += norm * weight;
    }

    const breakdown: ScoreBreakdown = { byMetric, composite };
    return buildRankedEntry(feature, composite, match.matchPercent, breakdown, match);
  });

  scored.sort((a, b) => b.matchPercent - a.matchPercent || b.score - a.score);

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
  displayScore: number,
  matchPercent: number,
  breakdown: ScoreBreakdown,
  match: Pick<RankedNeighborhood, "passedFilters" | "filterReasons">,
): RankedNeighborhood {
  const props = feature.properties;

  return {
    zip: props.zipCode,
    name: props.neighborhoodName,
    state: props.state,
    matchPercent: Math.round(matchPercent * 10) / 10,
    score: Math.round(displayScore * 10) / 10,
    rank: 0,
    center: featureCenter(feature),
    breakdown,
    metrics: featurePropertiesToZipMetrics(props),
    passedFilters: match.passedFilters,
    filterReasons: match.filterReasons,
  };
}
