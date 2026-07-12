import { getRawMetricFromFeature } from "./dc-metro-geojson";
import type { DcMetroGeoJson } from "./types";
import type { DiscoveryFilterMetric } from "./hybrid-scoring";
import { getDiscoveryMetricDef } from "./hybrid-scoring";

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

/**
 * Realistic slider bounds from ingested-metro distributions (p5–p95).
 * Overrides shard-local extrema when a metric has unrealistic single-metro tails.
 */
export const METRIC_SLIDER_BOUNDS: Partial<
  Record<DiscoveryFilterMetric, { min: number; max: number }>
> = {
  /** 17k+ ZCTAs across 80+ shards: p5 −2.7%, p95 6.3% */
  homePriceForecast1yr: { min: -3, max: 6 },
};

export function getMetricSliderBounds(
  metric: DiscoveryFilterMetric,
  shardHistogram: MetricHistogram | null,
): { min: number; max: number } {
  const global = METRIC_SLIDER_BOUNDS[metric];
  if (global) return global;

  const def = getDiscoveryMetricDef(metric);
  if (shardHistogram && shardHistogram.bins.length > 0) {
    return { min: shardHistogram.min, max: shardHistogram.max };
  }

  return {
    min: def.defaultMin ?? 0,
    max: def.defaultMax ?? 100,
  };
}

/** 20-bin histogram of metric values across a sandbox shard. */
export function getShardMetricHistogram(
  geoJson: DcMetroGeoJson,
  metric: DiscoveryFilterMetric,
  binCount = 20,
  sliderMin?: number,
  sliderMax?: number,
): MetricHistogram {
  const values = geoJson.features
    .map((f) => getRawMetricFromFeature(f.properties, metric))
    .filter((v) => Number.isFinite(v));

  if (values.length === 0) {
    const min = sliderMin ?? 0;
    const max = sliderMax ?? 100;
    return { min, max, bins: [] };
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const min = sliderMin ?? dataMin;
  const max = sliderMax ?? dataMax;
  const span = max - min || 1;
  const binWidth = span / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0,
  }));

  for (const v of values) {
    if (v < min || v > max) continue;
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }

  return { min, max, bins };
}
