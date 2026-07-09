import type { ZipMetrics, ZipMetricsCollection } from "./types";
import { computeOpportunityScore, enrichWithOpportunityScores } from "./opportunity-index";
import { validateZipMetricsCollection, type ZipMetricsInput } from "./validation";

import mockData from "../../../data/mock/zip-metrics.json";

function enrichZip(zip: ZipMetricsInput): ZipMetrics {
  const opportunityScore = computeOpportunityScore(zip);
  return { ...zip, opportunityScore };
}

export function loadMockZipMetrics(): ZipMetricsCollection {
  const validated = validateZipMetricsCollection(mockData);
  const zips = validated.zips.map(enrichZip);
  const withNormalized = enrichWithOpportunityScores(zips);

  return {
    metro: validated.metro,
    updatedAt: validated.updatedAt,
    zips: withNormalized,
  };
}

export function getZipByCode(zipCode: string): ZipMetrics | undefined {
  return loadMockZipMetrics().zips.find((z) => z.zip === zipCode);
}
