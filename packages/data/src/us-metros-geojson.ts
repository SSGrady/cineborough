import usMetrosGeoJson from "../../../data/mock/us-metros.geojson";
import type { DcMetroGeoJson } from "./types";

export function loadUsMetrosGeoJson(): DcMetroGeoJson {
  return usMetrosGeoJson as unknown as DcMetroGeoJson;
}

/** Washington-Arlington-Alexandria CBSA — links national view to DC sandbox */
export const DC_METRO_CBSA = "47900";
