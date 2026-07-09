/**
 * Reference scores for all 5 sandbox ZIPs — see docs/schema/opportunity-index.md
 * Used for documentation and runtime sanity checks.
 */
import { loadMockZipMetrics } from "./loaders";
import { computeOpportunityScore } from "./opportunity-index";
import { SANDBOX_ZIPS } from "./validation";

export interface OpportunityScoreExample {
  zip: string;
  homePriceForecast1yr: number;
  remoteWorkPct: number;
  overvaluationPct: number;
  rawScore: number;
  normalizedScore: number;
}

/** Documented raw scores from opportunity-index.md (subset). */
export const DOCUMENTED_RAW_SCORES: Record<string, number> = {
  "22201": 32.4,
  "22204": 23.6,
  "20001": 22.7,
};

export function getOpportunityScoreExamples(): OpportunityScoreExample[] {
  const { zips } = loadMockZipMetrics();
  return zips.map((z) => ({
    zip: z.zip,
    homePriceForecast1yr: z.homePriceForecast1yr,
    remoteWorkPct: z.remoteWorkPct,
    overvaluationPct: z.overvaluationPct,
    rawScore: z.opportunityScore,
    normalizedScore: z.opportunityScoreNormalized ?? 0,
  }));
}

/** Verify formula matches docs and all sandbox ZIPs are scored. */
export function assertOpportunityScoresValid(): void {
  const examples = getOpportunityScoreExamples();

  if (examples.length !== SANDBOX_ZIPS.length) {
    throw new Error(`Expected ${SANDBOX_ZIPS.length} ZIPs, got ${examples.length}`);
  }

  for (const ex of examples) {
    const computed = computeOpportunityScore(ex);
    if (Math.abs(computed - ex.rawScore) > 0.001) {
      throw new Error(`Score mismatch for ${ex.zip}: ${computed} !== ${ex.rawScore}`);
    }

    const documented = DOCUMENTED_RAW_SCORES[ex.zip];
    if (documented !== undefined && Math.abs(documented - ex.rawScore) > 0.001) {
      throw new Error(`Documented score mismatch for ${ex.zip}: ${ex.rawScore} !== ${documented}`);
    }

    if (ex.normalizedScore < 0 || ex.normalizedScore > 100) {
      throw new Error(`Normalized score out of range for ${ex.zip}: ${ex.normalizedScore}`);
    }
  }
}
