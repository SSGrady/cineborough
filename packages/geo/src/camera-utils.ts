import type { MapCameraTarget } from "./color-scales";
import { US_NATIONAL_CAMERA } from "./us-map";

export type LngLat = [number, number];

export function isFiniteLngLat(coord: unknown): coord is LngLat {
  return (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  );
}

export function isValidCameraTarget(
  target: MapCameraTarget | null | undefined,
): target is MapCameraTarget {
  return (
    target != null &&
    isFiniteLngLat(target.center) &&
    Number.isFinite(target.zoom)
  );
}

/** Returns a camera with finite center/zoom, or the fallback when invalid. */
export function sanitizeCameraTarget(
  target: MapCameraTarget | null | undefined,
  fallback: MapCameraTarget = US_NATIONAL_CAMERA,
): MapCameraTarget {
  if (!isValidCameraTarget(target)) {
    return {
      center: [...fallback.center],
      zoom: fallback.zoom,
      pitch: fallback.pitch ?? 0,
      bearing: fallback.bearing ?? 0,
      duration: fallback.duration,
    };
  }

  return {
    center: [target.center[0], target.center[1]],
    zoom: target.zoom,
    pitch: target.pitch ?? 0,
    bearing: target.bearing ?? 0,
    duration: target.duration ?? fallback.duration,
  };
}

/** Drop null/NaN vertices before handing paths to Deck.gl PathLayer. */
export function sanitizeLngLatPath(path: LngLat[]): LngLat[] {
  return path.filter(isFiniteLngLat);
}

/** Outer-ring centroid for polygon / multipolygon geometries. */
export function centroidFromRing(ring: LngLat[]): LngLat | null {
  if (ring.length < 3) return null;
  const n = ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1
    : ring.length;
  if (n <= 0) return null;

  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < n; i++) {
    if (!isFiniteLngLat(ring[i])) continue;
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return [sumLng / n, sumLat / n];
}

export function centroidFromGeoJsonGeometry(geometry: {
  type: string;
  coordinates: unknown;
}): LngLat | null {
  if (geometry.type === "Polygon") {
    const ring = (geometry.coordinates as LngLat[][])[0];
    return ring ? centroidFromRing(ring) : null;
  }
  if (geometry.type === "MultiPolygon") {
    const ring = (geometry.coordinates as LngLat[][][])[0]?.[0];
    return ring ? centroidFromRing(ring) : null;
  }
  return null;
}
