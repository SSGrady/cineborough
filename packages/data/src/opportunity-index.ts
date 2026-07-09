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
