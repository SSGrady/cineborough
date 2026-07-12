import arlingtonPaths from "../../../data/mock/arlington-orange-line.geojson";
import orlandoPaths from "../../../data/mock/orlando-transit-path.geojson";
import sfBayPaths from "../../../data/mock/sf-bay-transit-path.geojson";
import sanJosePaths from "../../../data/mock/san-jose-transit-path.geojson";
import type { TransitPathCollection } from "./geojson-types";

const ALL_PATHS: TransitPathCollection = {
  type: "FeatureCollection",
  features: [
    ...(arlingtonPaths as unknown as TransitPathCollection).features,
    ...(orlandoPaths as unknown as TransitPathCollection).features,
    ...(sfBayPaths as unknown as TransitPathCollection).features,
    ...(sanJosePaths as unknown as TransitPathCollection).features,
  ],
};

export function loadTransitPaths(zip?: string): TransitPathCollection {
  if (!zip) return ALL_PATHS;
  return {
    type: "FeatureCollection",
    features: ALL_PATHS.features.filter((f) => f.properties.zip === zip),
  };
}
