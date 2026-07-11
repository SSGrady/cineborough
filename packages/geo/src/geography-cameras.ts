import {
  ARLINGTON_CLARENDON_CENTER,
  CINEMATIC_CAMERAS,
  DC_METRO_CENTER,
  DEFAULT_ZOOM,
  type MapCameraTarget,
} from "./color-scales";
import { US_NATIONAL_CAMERA } from "./us-map";

/** Continental US center — national explore view */
export const US_CENTER = US_NATIONAL_CAMERA.center;

export const US_ZOOM = US_NATIONAL_CAMERA.zoom;

export type GeographyLevel = "national" | "state" | "metro" | "county" | "zip";
export type CinematicSection = "metro" | "neighborhood" | "detail";

export interface GeographyCameraOptions {
  geography: GeographyLevel;
  zipCenter?: [number, number] | null;
  exploreMode?: boolean;
  cinematicSection?: CinematicSection;
  geographyOverride?: boolean;
  /** DC sandbox story scroll — disabled when user pans away */
  dcStoryActive?: boolean;
  scrollProgress?: number | null;
}

const GEOGRAPHY_PRESETS: Record<GeographyLevel, MapCameraTarget> = {
  national: US_NATIONAL_CAMERA,
  state: {
    center: [-77.0, 38.95],
    zoom: 8,
    pitch: 0,
    bearing: 0,
    duration: 0,
  },
  metro: {
    center: DC_METRO_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
    duration: 0,
  },
  county: {
    center: [-77.08, 38.88],
    zoom: 11,
    pitch: 20,
    bearing: 0,
    duration: 0,
  },
  zip: {
    center: ARLINGTON_CLARENDON_CENTER,
    zoom: 12.5,
    pitch: 45,
    bearing: -20,
    duration: 0,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpCamera(
  from: MapCameraTarget,
  to: MapCameraTarget,
  t: number,
): MapCameraTarget {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    center: [
      lerp(from.center[0], to.center[0], clamped),
      lerp(from.center[1], to.center[1], clamped),
    ],
    zoom: lerp(from.zoom, to.zoom, clamped),
    pitch: lerp(from.pitch ?? 0, to.pitch ?? 0, clamped),
    bearing: lerp(from.bearing ?? 0, to.bearing ?? 0, clamped),
    duration: 0,
  };
}

/** Smooth camera path: metro → neighborhood → detail across scroll progress */
export function interpolateCinematicCamera(progress: number): MapCameraTarget {
  const p = Math.max(0, Math.min(1, progress));
  const metro = CINEMATIC_CAMERAS.metro;
  const neighborhood = CINEMATIC_CAMERAS.neighborhood;
  const detail = CINEMATIC_CAMERAS.detail;

  if (p < 0.5) {
    return lerpCamera(metro, neighborhood, p / 0.5);
  }
  return lerpCamera(neighborhood, detail, (p - 0.5) / 0.5);
}

export function resolveMapCamera(options: GeographyCameraOptions): MapCameraTarget | null {
  if (options.exploreMode) {
    return null;
  }

  const {
    geography,
    zipCenter,
    cinematicSection = "metro",
    geographyOverride = false,
    dcStoryActive = false,
    scrollProgress = null,
  } = options;

  if (geographyOverride) {
    if (geography === "zip" && zipCenter) {
      return { ...GEOGRAPHY_PRESETS.zip, center: zipCenter, duration: 800 };
    }
    if (geography === "metro") {
      return null;
    }
    return { ...GEOGRAPHY_PRESETS[geography], duration: 800 };
  }

  if (dcStoryActive && scrollProgress !== null && scrollProgress !== undefined) {
    return interpolateCinematicCamera(scrollProgress);
  }

  if (geography === "metro") {
    return { ...CINEMATIC_CAMERAS[cinematicSection], duration: 800 };
  }

  return null;
}

export { GEOGRAPHY_PRESETS };
