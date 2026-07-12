import {
  normalizeForecastToFixedScore,
  normalizeHomeValueToFixedScore,
  normalizeMedianAgeToFixedScore,
  normalizeScores,
  normalizeToTercileScores,
  normalizeWalkabilityToFixedScore,
} from "./opportunity-index";
import type { MetricLayerKey, ZipMetrics } from "./types";

const VALUE_GRADIENT_METRICS = new Set<MetricLayerKey>(["marketPsf"]);
/** Absolute thresholds — not data-driven terciles. */
const FIXED_THRESHOLD_METRICS = new Set<MetricLayerKey>([
  "homePriceForecast1yr",
  "medianHomeValue",
  "medianAge",
  "walkabilityScore",
]);

function normalizeToFixedScore(key: MetricLayerKey, value: number): number {
  if (key === "medianHomeValue") return normalizeHomeValueToFixedScore(value);
  if (key === "medianAge") return normalizeMedianAgeToFixedScore(value);
  if (key === "walkabilityScore") return normalizeWalkabilityToFixedScore(value);
  return normalizeForecastToFixedScore(value);
}

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

  if (FIXED_THRESHOLD_METRICS.has(key)) {
    return new Map(zips.map((z, i) => [z.zip, normalizeToFixedScore(key, raw[i])]));
  }

  const { scores } = normalizeToTercileScores(raw);
  return new Map(zips.map((z, i) => [z.zip, scores[i]]));
}
