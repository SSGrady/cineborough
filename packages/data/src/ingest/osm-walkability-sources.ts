/**
 * OSM / Overpass walkability proxy types (ADR-012 / T048).
 * @see https://wiki.openstreetmap.org/wiki/Overpass_API
 */
export const OSM_ATTRIBUTION = "Walkability proxy from OpenStreetMap © contributors (ODbL).";

export const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

/** Amenity categories scored within 1 km of ZCTA centroid */
export const WALKABILITY_CATEGORIES = [
  "cafe",
  "grocery",
  "park",
  "transit",
] as const;

export type WalkabilityCategory = (typeof WALKABILITY_CATEGORIES)[number];

export interface WalkabilityCategoryCounts {
  cafe: number;
  grocery: number;
  park: number;
  transit: number;
}

export interface OsmWalkabilityZipRecord {
  zipCode: string;
  walkabilityScore: number;
  categoryCounts: WalkabilityCategoryCounts;
  /** Categories with at least one amenity (0–4) */
  categoryDiversity: number;
  centroidLat: number;
  centroidLng: number;
  radiusMeters: number;
  computedAt: string;
}

export interface OsmWalkabilityNormalizedBundle {
  source: "osm-overpass-walkability";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  recordCount: number;
  /** Scoring formula documented in ingest-osm-walkability.ts */
  scoringFormula: string;
  records: Record<string, OsmWalkabilityZipRecord>;
}
