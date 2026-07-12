import { CINEMATIC_CAMERAS, type MapCameraTarget } from "./color-scales";

/** Steeper pitch / zoom presets for Google 3D tiles visibility — Phase 2b T062. */
export const CINEMATIC_3D_CAMERAS = {
  metro: {
    ...CINEMATIC_CAMERAS.metro,
    zoom: 11,
    pitch: 55,
    bearing: -12,
    duration: 2000,
  },
  neighborhood: {
    ...CINEMATIC_CAMERAS.neighborhood,
    zoom: 13,
    pitch: 65,
    bearing: -22,
    duration: 2200,
  },
  detail: {
    ...CINEMATIC_CAMERAS.detail,
    zoom: 14.5,
    pitch: 72,
    bearing: -18,
    duration: 2400,
  },
} as const satisfies Record<string, MapCameraTarget>;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpCamera(from: MapCameraTarget, to: MapCameraTarget, t: number): MapCameraTarget {
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

/** GSAP scroll scrub path tuned for 3D terrain. */
export function interpolateCinematic3DCamera(progress: number): MapCameraTarget {
  const p = Math.max(0, Math.min(1, progress));
  const metro = CINEMATIC_3D_CAMERAS.metro;
  const neighborhood = CINEMATIC_3D_CAMERAS.neighborhood;
  const detail = CINEMATIC_3D_CAMERAS.detail;

  if (p < 0.5) {
    return lerpCamera(metro, neighborhood, p / 0.5);
  }
  return lerpCamera(neighborhood, detail, (p - 0.5) / 0.5);
}
