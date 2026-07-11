import type { MapCameraTarget } from "./color-scales";

/** Lower 48 — primary map canvas */
export const US_CONTINENTAL_BOUNDS: [[number, number], [number, number]] = [
  [-130, 22],
  [-63, 52],
];

/** Wider bounds when exploring AK/HI via insets */
export const US_FULL_BOUNDS: [[number, number], [number, number]] = [
  [-172, 18],
  [-62, 72],
];

/** Deck.gl MapboxOverlay only supports mercator — do not use Albers until MapLibre migration */
export const US_MAP_PROJECTION = {
  name: "mercator" as const,
};

/** @deprecated Albers breaks @deck.gl/mapbox — kept for future MapLibre path */
export const US_ALBERS = {
  name: "albers" as const,
  center: [-96, 37.5] as [number, number],
  parallels: [29.5, 45.5] as [number, number],
};

export const US_NATIONAL_CAMERA: MapCameraTarget = {
  center: [-96.5, 39.2],
  zoom: 4.35,
  pitch: 0,
  bearing: 0,
  duration: 800,
};

/** Orlando-Kissimmee-Sanford sandbox shard */
export const ORLANDO_METRO_CENTER: [number, number] = [-81.3792, 28.5383];

export const ORLANDO_METRO_CAMERA: MapCameraTarget = {
  center: ORLANDO_METRO_CENTER,
  zoom: 10.5,
  pitch: 0,
  bearing: 0,
  duration: 800,
};

/** San Francisco-Oakland-Berkeley sandbox shard */
export const SF_BAY_METRO_CENTER: [number, number] = [-122.35, 37.82];

export const SF_BAY_METRO_CAMERA: MapCameraTarget = {
  center: SF_BAY_METRO_CENTER,
  zoom: 10.2,
  pitch: 0,
  bearing: 0,
  duration: 800,
};

/** Flat overview cameras for non-DC sandbox metros (CBSA → camera) */
export const SANDBOX_METRO_CAMERAS: Record<string, MapCameraTarget> = {
  "36740": ORLANDO_METRO_CAMERA,
  "41860": SF_BAY_METRO_CAMERA,
};

/** Padding-aware fit for sidebar + header — used by MapView at national scale */
export const US_NATIONAL_FIT_PADDING = {
  top: 72,
  bottom: 88,
  left: 300,
  right: 48,
} as const;

export const ALASKA_CAMERA: MapCameraTarget = {
  center: [-152, 64],
  zoom: 3.2,
  pitch: 0,
  bearing: 0,
  duration: 800,
};

export const HAWAII_CAMERA: MapCameraTarget = {
  center: [-157.5, 20.8],
  zoom: 5.5,
  pitch: 0,
  bearing: 0,
  duration: 800,
};

/** DC metro sandbox — story scroll only applies inside this box */
export const DC_SANDBOX_BOUNDS: [[number, number], [number, number]] = [
  [-77.35, 38.65],
  [-76.75, 39.15],
];

export function isInsideDcSandbox(lng: number, lat: number): boolean {
  const [[west, south], [east, north]] = DC_SANDBOX_BOUNDS;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export type UsInsetRegion = "continental" | "alaska" | "hawaii";

export const US_INSET_CAMERAS: Record<UsInsetRegion, MapCameraTarget> = {
  continental: US_NATIONAL_CAMERA,
  alaska: ALASKA_CAMERA,
  hawaii: HAWAII_CAMERA,
};
