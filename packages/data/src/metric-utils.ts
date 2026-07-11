import {
  normalizeForecastToFixedScore,
  normalizeHomeValueToFixedScore,
  normalizeScores,
  normalizeToTercileScores,
} from "./opportunity-index";
import type { MetricLayerKey, ZipMetrics } from "./types";

const VALUE_GRADIENT_METRICS = new Set<MetricLayerKey>(["marketPsf"]);
/** Low raw values map to green (younger residents). */
const AFFORDABILITY_TERCILE_METRICS = new Set<MetricLayerKey>(["medianAge"]);
/** Absolute thresholds — not data-driven terciles. */
const FIXED_THRESHOLD_METRICS = new Set<MetricLayerKey>([
  "homePriceForecast1yr",
  "medianHomeValue",
]);

function normalizeToFixedScore(key: MetricLayerKey, value: number): number {
  if (key === "medianHomeValue") return normalizeHomeValueToFixedScore(value);
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

  const { scores } = normalizeToTercileScores(raw, {
    invert: AFFORDABILITY_TERCILE_METRICS.has(key),
  });
  return new Map(zips.map((z, i) => [z.zip, scores[i]]));
}
