import type { DcMetroGeoJson } from "./types.ts";

/**
 * Replace coarse CBSA polygons with neighborhood-level shard features for ingested metros.
 * Un-ingested metros keep their CBSA outline from us-metros.geojson.
 */
export function mergeMetroOverviewWithShards(
  metros: DcMetroGeoJson,
  shardsByCbsa: ReadonlyMap<string, DcMetroGeoJson>,
): DcMetroGeoJson {
  if (shardsByCbsa.size === 0) return metros;

  const replacedCbsas = new Set(shardsByCbsa.keys());
  const coarseFeatures = metros.features.filter(
    (f) => !replacedCbsas.has(f.properties.zipCode),
  );
  const shardFeatures = [...shardsByCbsa.values()].flatMap((s) => s.features);

  return {
    type: "FeatureCollection",
    metadata: metros.metadata,
    features: [...coarseFeatures, ...shardFeatures],
  };
}

/** CBSAs whose centroids fall inside the map viewport (for lazy shard loading). */
export function cbsasInViewport(
  metros: DcMetroGeoJson,
  bounds: [[number, number], [number, number]],
  ingestedCbsas: ReadonlySet<string>,
): string[] {
  const [[west, south], [east, north]] = bounds;

  return metros.features
    .filter((f) => {
      const cbsa = f.properties.zipCode;
      if (!ingestedCbsas.has(cbsa)) return false;
      const { labelLng, labelLat } = f.properties;
      return (
        labelLng >= west &&
        labelLng <= east &&
        labelLat >= south &&
        labelLat <= north
      );
    })
    .map((f) => f.properties.zipCode);
}
