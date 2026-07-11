import {
  normalizeForecastToFixedScore,
  normalizeScores,
  normalizeToTercileScores,
} from "./opportunity-index";
import type { MetricLayerKey, ZipMetrics } from "./types";

const VALUE_GRADIENT_METRICS = new Set<MetricLayerKey>(["marketPsf"]);
/** Low raw values map to green (affordable homes, younger residents). */
const AFFORDABILITY_TERCILE_METRICS = new Set<MetricLayerKey>([
  "medianHomeValue",
  "medianAge",
]);
/** Absolute thresholds — not data-driven terciles. */
const FIXED_THRESHOLD_METRICS = new Set<MetricLayerKey>(["homePriceForecast1yr"]);

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
    return new Map(
      zips.map((z, i) => [z.zip, normalizeForecastToFixedScore(raw[i])]),
    );
  }

  const { scores } = normalizeToTercileScores(raw, {
    invert: AFFORDABILITY_TERCILE_METRICS.has(key),
  });
  return new Map(zips.map((z, i) => [z.zip, scores[i]]));
}
