import boundaries from "../../../data/mock/zip-boundaries.geojson";
import type { ZipBoundaryCollection } from "./geojson-types";

export type ZipBoundaries = ZipBoundaryCollection;

export function loadZipBoundaries(): ZipBoundaries {
  return boundaries as unknown as ZipBoundaries;
}
