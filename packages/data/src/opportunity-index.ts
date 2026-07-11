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
