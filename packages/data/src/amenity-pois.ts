import amenities from "../../../data/mock/sandbox-amenities.geojson";

export type AmenityCategory = "park" | "transit" | "coffee" | "trail";

export interface AmenityPoiProperties {
  zip: string;
  name: string;
  category: AmenityCategory;
  cbsa: string;
}

export interface AmenityPoiFeature {
  type: "Feature";
  properties: AmenityPoiProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface AmenityPoiCollection {
  type: "FeatureCollection";
  features: AmenityPoiFeature[];
}

const COLLECTION = amenities as unknown as AmenityPoiCollection;

/** Mock hope-core amenity POIs per sandbox ZIP (parks, transit, coffee). Replaced by OSM ingest (T048). */
export function loadAmenityPois(zip?: string): AmenityPoiFeature[] {
  if (!zip) return COLLECTION.features;
  return COLLECTION.features.filter((f) => f.properties.zip === zip);
}
