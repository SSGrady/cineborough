import type { ZipMetrics } from "./types";

/**
 * Opportunity Index — see docs/schema/opportunity-index.md
 */
export function computeOpportunityScore(zip: Pick<ZipMetrics, "homePriceForecast1yr" | "remoteWorkPct" | "overvaluationPct">): number {
  return zip.homePriceForecast1yr + zip.remoteWorkPct - zip.overvaluationPct;
}

export function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 50);
  return scores.map((s) => ((s - min) / (max - min)) * 100);
}

export interface TercileNormalization {
  scores: number[];
  p33: number;
  p66: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Percentile tercile buckets (33rd / 66th) mapped to choropleth scores.
 * Identical raw values always land in the same color bucket.
 */
export interface TercileScoreOptions {
  /** Low raw values map to green (buyer affordability semantics). */
  invert?: boolean;
}

/**
 * Fixed buyer-semantics buckets for 1-year price forecast choropleth.
 * Maps to OPPORTUNITY_COLOR_STOPS scores (20 / 55 / 85) for red / white tint / blue tint.
 *
 * Edge case: 0% to <0.1% is white tint (flat/neutral growth), not red.
 */
export const FORECAST_COLOR_THRESHOLDS = {
  /** Values below this are red (declining prices). */
  negativeMax: 0,
  /** Values at or above this are blue tint (strong growth). */
  greenMin: 3,
} as const;

export function normalizeForecastToFixedScore(forecastPct: number): number {
  if (forecastPct < FORECAST_COLOR_THRESHOLDS.negativeMax) return 20;
  if (forecastPct < FORECAST_COLOR_THRESHOLDS.greenMin) return 55;
  return 85;
}

/**
 * Fixed buyer-semantics buckets for median home value choropleth.
 * Maps to OPPORTUNITY_COLOR_STOPS scores (85 / 55 / 20) for blue tint / white tint / red.
 *
 * Edge cases: $300,000 and $750,000 are white tint (inclusive middle band).
 */
export const HOME_VALUE_COLOR_THRESHOLDS = {
  /** Values below this are blue tint (more affordable). */
  greenMax: 300_000,
  /** Values at or below this (and >= greenMax) are white tint (middle range). */
  yellowMax: 750_000,
} as const;

export function normalizeHomeValueToFixedScore(homeValue: number): number {
  if (homeValue < HOME_VALUE_COLOR_THRESHOLDS.greenMax) return 85;
  if (homeValue <= HOME_VALUE_COLOR_THRESHOLDS.yellowMax) return 55;
  return 20;
}

/**
 * Fixed buyer-semantics buckets for median age choropleth.
 * Maps to OPPORTUNITY_COLOR_STOPS scores (85 / 55 / 20) for blue tint / white tint / red.
 * Younger residents = blue tint (inverted vs typical "high is good" terciles).
 *
 * Edge cases: 37.0 and 38.6 are white tint (inclusive middle band).
 */
export const MEDIAN_AGE_COLOR_THRESHOLDS = {
  /** Values below this are blue tint (younger residents). */
  greenMax: 37.0,
  /** Values at or below this (and >= greenMax) are white tint. */
  yellowMax: 38.6,
} as const;

export function normalizeMedianAgeToFixedScore(age: number): number {
  if (age < MEDIAN_AGE_COLOR_THRESHOLDS.greenMax) return 85;
  if (age <= MEDIAN_AGE_COLOR_THRESHOLDS.yellowMax) return 55;
  return 20;
}

/**
 * Fixed buckets for walkability score choropleth.
 * Maps to OPPORTUNITY_COLOR_STOPS scores (20 / 55 / 85) for red / white tint / blue tint.
 *
 * Edge cases: 50.0 and 60.9 are white tint (inclusive middle band).
 */
export const WALKABILITY_COLOR_THRESHOLDS = {
  /** Values below this are red (car-dependent). */
  redMax: 50.0,
  /** Values at or above this are blue tint (highly walkable). */
  greenMin: 61,
} as const;

export function normalizeWalkabilityToFixedScore(score: number): number {
  if (score < WALKABILITY_COLOR_THRESHOLDS.redMax) return 20;
  if (score < WALKABILITY_COLOR_THRESHOLDS.greenMin) return 55;
  return 85;
}

export function normalizeToTercileScores(
  values: number[],
  options?: TercileScoreOptions,
): TercileNormalization {
  if (values.length === 0) return { scores: [], p33: 0, p66: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const p33 = percentile(sorted, 0.33);
  const p66 = percentile(sorted, 0.66);
  const invert = options?.invert === true;

  const scores = values.map((v) => {
    if (v <= p33) return invert ? 85 : 20;
    if (v <= p66) return 55;
    return invert ? 20 : 85;
  });

  return { scores, p33, p66 };
}

export function withNormalizedOpportunityScores<T extends Pick<ZipMetrics, "opportunityScore">>(
  zips: T[],
): (T & { opportunityScoreNormalized: number })[] {
  const raw = zips.map((z) => z.opportunityScore);
  const normalized = normalizeScores(raw);
  return zips.map((z, i) => ({
    ...z,
    opportunityScoreNormalized: normalized[i],
  }));
}

/** Alias used by loaders — computes raw score + 0–100 normalization. */
export const enrichWithOpportunityScores = withNormalizedOpportunityScores;
