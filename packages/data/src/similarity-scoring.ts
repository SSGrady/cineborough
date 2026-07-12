import { getRawMetricFromFeature } from "./dc-metro-geojson";
import {
  DISCOVERY_FILTER_METRICS,
  getDiscoveryMetricDef,
  type DiscoveryFilterMetric,
  type RankedNeighborhood,
} from "./hybrid-scoring";
import type { DcMetroGeoJson } from "./types";

export const MAX_EXAMPLE_ZIPS = 3;

interface MetricNorm {
  min: number;
  max: number;
  higherIsBetter: boolean;
}

function buildMetricNorms(geoJson: DcMetroGeoJson): Map<DiscoveryFilterMetric, MetricNorm> {
  const norms = new Map<DiscoveryFilterMetric, MetricNorm>();
  for (const metric of DISCOVERY_FILTER_METRICS) {
    const def = getDiscoveryMetricDef(metric);
    const values = geoJson.features.map((f) => getRawMetricFromFeature(f.properties, metric));
    norms.set(metric, {
      min: Math.min(...values),
      max: Math.max(...values),
      higherIsBetter: def.higherIsBetter,
    });
  }
  return norms;
}

function vectorForFeature(
  props: DcMetroGeoJson["features"][number]["properties"],
  norms: Map<DiscoveryFilterMetric, MetricNorm>,
): number[] {
  return DISCOVERY_FILTER_METRICS.map((metric) => {
    const raw = getRawMetricFromFeature(props, metric);
    const norm = norms.get(metric)!;
    const span = norm.max - norm.min || 1;
    const t = (raw - norm.min) / span;
    return norm.higherIsBetter ? t : 1 - t;
  });
}

/** Cosine similarity mapped to 0–100%. */
export function cosineSimilarityPercent(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  const cosine = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return Math.round(Math.max(0, Math.min(100, cosine * 100)) * 10) / 10;
}

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const len = vectors[0].length;
  const out = Array.from({ length: len }, () => 0);
  for (const vec of vectors) {
    for (let i = 0; i < len; i++) {
      out[i] += vec[i];
    }
  }
  for (let i = 0; i < len; i++) {
    out[i] /= vectors.length;
  }
  return out;
}

/** Similarity % for one ZIP vs 1–3 example ZIPs (sandbox-only). */
export function similarityPercentForZip(
  geoJson: DcMetroGeoJson,
  targetZip: string,
  exampleZips: string[],
): number | null {
  const examples = exampleZips.slice(0, MAX_EXAMPLE_ZIPS);
  if (examples.length === 0) return null;

  const norms = buildMetricNorms(geoJson);
  const exampleFeatures = examples
    .map((zip) => geoJson.features.find((f) => f.properties.zipCode === zip))
    .filter((f): f is DcMetroGeoJson["features"][number] => f !== undefined);
  if (exampleFeatures.length === 0) return null;

  const target = geoJson.features.find((f) => f.properties.zipCode === targetZip);
  if (!target) return null;

  const exampleVec = averageVectors(
    exampleFeatures.map((f) => vectorForFeature(f.properties, norms)),
  );
  const targetVec = vectorForFeature(target.properties, norms);
  return cosineSimilarityPercent(exampleVec, targetVec);
}

/** Attach similarity % to ranked neighborhoods without changing criterion match %. */
export function applySimilarityScores(
  results: RankedNeighborhood[],
  geoJson: DcMetroGeoJson,
  exampleZips: string[],
): RankedNeighborhood[] {
  if (exampleZips.length === 0) {
    return results.map((r) => {
      const { similarityPercent: _omit, ...rest } = r;
      return rest;
    });
  }

  return results.map((r) => ({
    ...r,
    similarityPercent: similarityPercentForZip(geoJson, r.zip, exampleZips) ?? undefined,
  }));
}
