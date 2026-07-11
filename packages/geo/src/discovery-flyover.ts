import type { MapCameraTarget } from "./color-scales";

/** Cinematic camera for discovery flyover stops — pitched descent to ZIP centroid */
export const DISCOVERY_FLYOVER_CAMERA: Omit<MapCameraTarget, "center"> = {
  zoom: 13.2,
  pitch: 55,
  bearing: -18,
  duration: 2200,
};

export function discoveryFlyoverCamera(center: [number, number]): MapCameraTarget {
  return { ...DISCOVERY_FLYOVER_CAMERA, center };
}
