import {
  ARLINGTON_CLARENDON_CENTER,
  CINEMATIC_CAMERAS,
  type MapCameraTarget,
} from "./color-scales";
import { interpolateCinematic3DCamera } from "./cinematic-3d-cameras";
import { isFiniteLngLat, isValidCameraTarget, sanitizeCameraTarget } from "./camera-utils";
import {
  SANDBOX_METRO_CAMERAS,
  US_INSET_CAMERAS,
  US_NATIONAL_CAMERA,
  type UsInsetRegion,
} from "./us-map";

/** Continental US center — national explore view */
export const US_CENTER = US_NATIONAL_CAMERA.center;

export const US_ZOOM = US_NATIONAL_CAMERA.zoom;

export type GeographyLevel = "national" | "state" | "metro" | "county" | "zip";
export type CinematicSection = "metro" | "neighborhood" | "detail";

/** Geography tabs that keep a flat, continental overview (no story camera). */
export const OVERVIEW_GEOGRAPHY_LEVELS: GeographyLevel[] = [
  "national",
  "state",
  "metro",
  "county",
];

export function isOverviewGeography(geography: GeographyLevel): boolean {
  return OVERVIEW_GEOGRAPHY_LEVELS.includes(geography);
}

export interface GeographyCameraOptions {
  geography: GeographyLevel;
  zipCenter?: [number, number] | null;
  exploreMode?: boolean;
  cinematicSection?: CinematicSection;
  /** User drilled into a sandbox metro — cinematic allowed */
  sandboxCinematicActive?: boolean;
  /** DC sandbox story scroll — disabled when user pans away */
  dcStoryActive?: boolean;
  scrollProgress?: number | null;
  /** Phase 2b — steeper GSAP path when 3D tiles flag is on */
  use3DCameraPath?: boolean;
}

const GEOGRAPHY_PRESETS: Record<GeographyLevel, MapCameraTarget> = {
  national: US_NATIONAL_CAMERA,
  state: US_NATIONAL_CAMERA,
  metro: US_NATIONAL_CAMERA,
  county: US_NATIONAL_CAMERA,
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
  const safeFrom = sanitizeCameraTarget(from);
  const safeTo = sanitizeCameraTarget(to);
  const clamped = Math.max(0, Math.min(1, t));
  return {
    center: [
      lerp(safeFrom.center[0], safeTo.center[0], clamped),
      lerp(safeFrom.center[1], safeTo.center[1], clamped),
    ],
    zoom: lerp(safeFrom.zoom, safeTo.zoom, clamped),
    pitch: lerp(safeFrom.pitch ?? 0, safeTo.pitch ?? 0, clamped),
    bearing: lerp(safeFrom.bearing ?? 0, safeTo.bearing ?? 0, clamped),
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

/**
 * Returns a camera target only for sandbox cinematic modes.
 * Overview geography tabs retain the current map position (return null).
 */
/** Reverse cinematic tilt when returning to continental / inset overview. */
export function buildOverviewRestoreCamera(
  saved?: MapCameraTarget | null,
  insetRegion: UsInsetRegion = "continental",
): MapCameraTarget {
  if (insetRegion !== "continental") {
    return { ...US_INSET_CAMERAS[insetRegion], pitch: 0, bearing: 0, duration: 1200 };
  }
  const base = isValidCameraTarget(saved) ? saved : US_NATIONAL_CAMERA;
  return {
    center: [base.center[0], base.center[1]],
    zoom: base.zoom,
    pitch: 0,
    bearing: 0,
    duration: 1200,
  };
}

/**
 * Single source of truth for sandbox metro birds-eye — known presets beat
 * drill-time overview cameras so exit-restore and steady-state targets match.
 */
export function resolveSandboxMetroCamera(
  cbsa: string,
  metroCameras: Record<string, MapCameraTarget>,
): MapCameraTarget | null {
  return SANDBOX_METRO_CAMERAS[cbsa] ?? metroCameras[cbsa] ?? null;
}

/** Flat sandbox metro overview after background click or flyover exit. */
export function buildSandboxFlatRestore(
  cbsa: string,
  metroCameras: Record<string, MapCameraTarget>,
): MapCameraTarget {
  const camera =
    resolveSandboxMetroCamera(cbsa, metroCameras) ??
    { ...CINEMATIC_CAMERAS.metro, pitch: 0, bearing: 0 };
  return { ...camera, pitch: 0, bearing: 0, duration: 1000 };
}

export interface BackgroundClickRestoreOptions {
  isOverviewMode: boolean;
  sandboxDrillActive: boolean;
  storyCameraActive: boolean;
  selectedZip: string | null;
  geography: GeographyLevel;
  discoveryFlyoverActive: boolean;
  activeSandboxCbsa: string;
  sandboxCameras: Record<string, MapCameraTarget>;
  savedOverviewCamera?: MapCameraTarget | null;
  usInsetRegion?: UsInsetRegion;
}

/** Camera target for map background click — reverse pitch/bearing to flat overview. */
export function buildBackgroundClickRestore(
  options: BackgroundClickRestoreOptions,
): MapCameraTarget | null {
  const {
    isOverviewMode,
    sandboxDrillActive,
    storyCameraActive,
    selectedZip,
    geography,
    discoveryFlyoverActive,
    activeSandboxCbsa,
    sandboxCameras,
    savedOverviewCamera,
    usInsetRegion = "continental",
  } = options;

  if (options.isOverviewMode && isOverviewGeography(options.geography)) {
    return buildOverviewRestoreCamera(savedOverviewCamera, usInsetRegion);
  }

  if (!sandboxDrillActive) return null;

  const pitched =
    storyCameraActive || selectedZip !== null || geography === "zip" || discoveryFlyoverActive;

  if (!pitched) return null;

  return buildSandboxFlatRestore(activeSandboxCbsa, sandboxCameras);
}

export function resolveMapCamera(options: GeographyCameraOptions): MapCameraTarget | null {
  if (options.exploreMode) {
    return null;
  }

  const {
    geography,
    zipCenter,
    cinematicSection = "metro",
    sandboxCinematicActive = false,
    dcStoryActive = false,
    scrollProgress = null,
    use3DCameraPath = false,
  } = options;

  if (geography === "zip" && zipCenter && isFiniteLngLat(zipCenter)) {
    return { ...GEOGRAPHY_PRESETS.zip, center: zipCenter, duration: 800 };
  }

  if (dcStoryActive && scrollProgress !== null && scrollProgress !== undefined) {
    return use3DCameraPath
      ? interpolateCinematic3DCamera(scrollProgress)
      : interpolateCinematicCamera(scrollProgress);
  }

  if (sandboxCinematicActive) {
    return { ...CINEMATIC_CAMERAS[cinematicSection], duration: 800 };
  }

  if (isOverviewGeography(geography)) {
    return null;
  }

  return null;
}

export { GEOGRAPHY_PRESETS };
