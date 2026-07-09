import paths from "../../../data/mock/arlington-orange-line.geojson";
import type { TransitPathCollection } from "./geojson-types";

export function loadTransitPaths(): TransitPathCollection {
  return paths as unknown as TransitPathCollection;
}
