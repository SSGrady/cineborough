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

/** Reject null island and other non-finite vertices for Deck.gl paths. */
export function isUsableLngLat(coord: unknown): coord is LngLat {
  return (
    isFiniteLngLat(coord) &&
    !(coord[0] === 0 && coord[1] === 0)
  );
}

const MAX_PATH_SEGMENT_METERS = 5_000;

function segmentLengthMeters(a: LngLat, b: LngLat): number {
  const earthRadius = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Drop bad vertices and split on long jumps so Deck.gl never draws cross-map chords.
 * Returns the longest contiguous run with segments under MAX_PATH_SEGMENT_METERS.
 */
export function sanitizeLngLatPath(path: LngLat[]): LngLat[] {
  const filtered = path.filter(isUsableLngLat);
  if (filtered.length < 2) return [];

  const runs: LngLat[][] = [];
  let current: LngLat[] = [filtered[0]];

  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1];
    const next = filtered[i];
    if (segmentLengthMeters(prev, next) > MAX_PATH_SEGMENT_METERS) {
      if (current.length >= 2) runs.push(current);
      current = [next];
    } else {
      current.push(next);
    }
  }
  if (current.length >= 2) runs.push(current);

  if (runs.length === 0) return [];
  return runs.reduce((longest, run) => (run.length > longest.length ? run : longest));
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

export type GeoBounds = [[number, number], [number, number]];

/** Axis-aligned bounding box for polygon / multipolygon geometries. */
export function boundsFromGeoJsonGeometry(geometry: {
  type: string;
  coordinates: unknown;
}): GeoBounds | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const consider = (lng: number, lat: number) => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  };

  const processRing = (ring: LngLat[]) => {
    for (const coord of ring) {
      if (isFiniteLngLat(coord)) consider(coord[0], coord[1]);
    }
  };

  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as LngLat[][];
    for (const ring of rings) processRing(ring);
  } else if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates as LngLat[][][];
    for (const polygon of polygons) {
      for (const ring of polygon) processRing(ring);
    }
  } else {
    return null;
  }

  if (!Number.isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
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
