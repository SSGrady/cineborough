import { normalizeScores, normalizeToTercileScores } from "./opportunity-index";
import type { MetricLayerKey, ZipMetrics } from "./types";

const VALUE_GRADIENT_METRICS = new Set<MetricLayerKey>(["marketPsf"]);

export function getRawMetricValue(zip: ZipMetrics, key: MetricLayerKey): number {
  if (key === "opportunityScore") {
    return zip.opportunityScore;
  }
  return zip[key];
}

export function getNormalizedMetricValues(
  zips: ZipMetrics[],
  key: MetricLayerKey,
): Map<string, number> {
  if (key === "opportunityScore") {
    return new Map(
      zips.map((z) => [z.zip, z.opportunityScoreNormalized ?? z.opportunityScore]),
    );
  }

  const raw = zips.map((z) => getRawMetricValue(z, key));
  if (VALUE_GRADIENT_METRICS.has(key)) {
    const normalized = normalizeScores(raw);
    return new Map(zips.map((z, i) => [z.zip, normalized[i]]));
  }

  const { scores } = normalizeToTercileScores(raw);
  return new Map(zips.map((z, i) => [z.zip, scores[i]]));
}
