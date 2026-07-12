import { getRawMetricFromFeature } from "./dc-metro-geojson";
import type { DcMetroGeoJson } from "./types";
import type { DiscoveryFilterMetric } from "./hybrid-scoring";

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface MetricHistogram {
  min: number;
  max: number;
  bins: HistogramBin[];
}

/** 20-bin histogram of metric values across a sandbox shard. */
export function getShardMetricHistogram(
  geoJson: DcMetroGeoJson,
  metric: DiscoveryFilterMetric,
  binCount = 20,
): MetricHistogram {
  const values = geoJson.features
    .map((f) => getRawMetricFromFeature(f.properties, metric))
    .filter((v) => Number.isFinite(v));

  if (values.length === 0) {
    return { min: 0, max: 100, bins: [] };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const binWidth = span / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0,
  }));

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }

  return { min, max, bins };
}
