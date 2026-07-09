import type { ZipMetrics, ZipMetricsCollection } from "./types";
import { computeOpportunityScore, withNormalizedOpportunityScores } from "./opportunity-index";

// Mock data is loaded from the repo root data/mock/ directory.
// In apps/web, this is resolved via Next.js fs or a copied import path.
import mockData from "../../../data/mock/zip-metrics.json";

function enrichZip(zip: Omit<ZipMetrics, "opportunityScore">): ZipMetrics {
  const opportunityScore = computeOpportunityScore(zip);
  return { ...zip, opportunityScore };
}

export function loadMockZipMetrics(): ZipMetricsCollection {
  const zips = mockData.zips.map((z) => enrichZip(z as Omit<ZipMetrics, "opportunityScore">));
  const withNormalized = withNormalizedOpportunityScores(zips);

  return {
    metro: mockData.metro,
    updatedAt: mockData.updatedAt,
    zips: withNormalized,
  };
}

export function getZipByCode(zipCode: string): ZipMetrics | undefined {
  return loadMockZipMetrics().zips.find((z) => z.zip === zipCode);
}
