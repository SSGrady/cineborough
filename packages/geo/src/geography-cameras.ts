import {
  ARLINGTON_CLARENDON_CENTER,
  CINEMATIC_CAMERAS,
  DC_METRO_CENTER,
  DEFAULT_ZOOM,
  type MapCameraTarget,
} from "./color-scales";

/** Continental US center — national explore view */
export const US_CENTER: [number, number] = [-98.5795, 39.8283];

export const US_ZOOM = 4;

export type GeographyLevel = "national" | "state" | "metro" | "county" | "zip";

export interface GeographyCameraOptions {
  geography: GeographyLevel;
  /** Centroid for zip-level fly-to */
  zipCenter?: [number, number] | null;
  /** When true, scroll-driven cinematic presets are skipped */
  exploreMode?: boolean;
  /** Active scroll section when in cinematic (not explore) mode */
  cinematicSection?: "metro" | "neighborhood" | "detail";
}

const GEOGRAPHY_PRESETS: Record<GeographyLevel, MapCameraTarget> = {
  national: {
    center: US_CENTER,
    zoom: US_ZOOM,
    pitch: 0,
    bearing: 0,
    duration: 1400,
  },
  state: {
    center: [-77.0, 38.95],
    zoom: 8,
    pitch: 0,
    bearing: 0,
    duration: 1400,
  },
  metro: {
    center: DC_METRO_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
    duration: 1400,
  },
  county: {
    center: [-77.08, 38.88],
    zoom: 11,
    pitch: 20,
    bearing: 0,
    duration: 1400,
  },
  zip: {
    center: ARLINGTON_CLARENDON_CENTER,
    zoom: 12.5,
    pitch: 45,
    bearing: -20,
    duration: 1400,
  },
};

/**
 * Resolve camera target from geography + cinematic scroll state.
 * Geography selection takes precedence over scroll section when not in explore mode.
 */
export function resolveMapCamera(options: GeographyCameraOptions): MapCameraTarget | null {
  if (options.exploreMode) {
    return null;
  }

  const { geography, zipCenter, cinematicSection = "metro" } = options;

  if (geography === "zip" && zipCenter) {
    return {
      ...GEOGRAPHY_PRESETS.zip,
      center: zipCenter,
    };
  }

  if (geography === "national" || geography === "state") {
    return GEOGRAPHY_PRESETS[geography];
  }

  if (geography === "county") {
    return GEOGRAPHY_PRESETS.county;
  }

  if (geography === "zip") {
    return GEOGRAPHY_PRESETS.zip;
  }

  // Metro level: cinematic scroll sections drive camera
  return CINEMATIC_CAMERAS[cinematicSection];
}

export { GEOGRAPHY_PRESETS };
