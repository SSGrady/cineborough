import type { DcMetroGeoJson, MetroGeometry } from "@cineborough/data";
import { sanitizeLngLatPath } from "@cineborough/geo";

export type LngLat = [number, number];

export interface BoundaryRing {
  ring: LngLat[];
  regionId: string;
}

interface RingArc {
  points: LngLat[];
  cumulative: number[];
  total: number;
}

const TINY_TRAIL_FRACTION = 0.012;

/** Outer rings only — skips polygon holes. */
export function extractOuterRings(geoJson: DcMetroGeoJson, regionId: string): BoundaryRing[] {
  const feature = geoJson.features.find((f) => f.properties.zipCode === regionId);
  if (!feature) return [];

  return outerRingsFromGeometry(feature.geometry, regionId);
}

function outerRingsFromGeometry(geometry: MetroGeometry, regionId: string): BoundaryRing[] {
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0] as LngLat[];
    return ring.length >= 2 ? [{ ring, regionId }] : [];
  }

  return geometry.coordinates
    .map((polygon) => polygon[0] as LngLat[])
    .filter((ring) => ring.length >= 2)
    .map((ring) => ({ ring, regionId }));
}

function openRing(ring: LngLat[]): LngLat[] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice(0, -1);
  }
  return ring;
}

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

function buildRingArc(ring: LngLat[]): RingArc {
  const points = openRing(ring);
  const n = points.length;
  const cumulative = new Array<number>(n + 1).fill(0);

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    cumulative[i + 1] = cumulative[i] + segmentLengthMeters(points[i], points[next]);
  }

  return { points, cumulative, total: cumulative[n] };
}

function sampleAtDistance(arc: RingArc, distance: number): LngLat | null {
  if (arc.total <= 0 || arc.points.length === 0) {
    return arc.points.find((point) => Number.isFinite(point[0]) && Number.isFinite(point[1])) ?? null;
  }

  const d = Math.max(0, Math.min(arc.total, distance));

  let i = 0;
  while (i < arc.points.length - 1 && arc.cumulative[i + 1] < d) {
    i++;
  }

  const segStart = arc.cumulative[i];
  const segEnd = arc.cumulative[i + 1];
  const segLen = segEnd - segStart;
  const t = segLen < 1e-9 ? 0 : (d - segStart) / segLen;
  const a = arc.points[i];
  const b = arc.points[(i + 1) % arc.points.length];

  if (
    !Number.isFinite(a[0]) ||
    !Number.isFinite(a[1]) ||
    !Number.isFinite(b[0]) ||
    !Number.isFinite(b[1])
  ) {
    return null;
  }

  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

/**
 * Tail pinned at ring origin. Progress 0→1 crawls the full perimeter at even speed.
 * Resets to a pinprick when progress reaches 1 (head meets tail).
 */
export function trailSegmentAlongRing(ring: LngLat[], progress: number): LngLat[] {
  const arc = buildRingArc(ring);
  if (arc.points.length < 2 || arc.total <= 0) return [];

  const clamped = Math.max(0, Math.min(0.9999, progress));
  const tiny = arc.total * TINY_TRAIL_FRACTION;

  if (clamped <= 0) {
    const start = sampleAtDistance(arc, 0);
    const end = sampleAtDistance(arc, tiny);
    if (!start || !end) return [];
    return [start, end];
  }

  const headDistance = clamped * arc.total;
  const trailEnd = Math.max(tiny, headDistance);
  const sampleStep = Math.max(arc.total / 180, 8);
  const steps = Math.max(2, Math.ceil(trailEnd / sampleStep));
  const segment: LngLat[] = [];

  for (let i = 0; i <= steps; i++) {
    const point = sampleAtDistance(arc, (trailEnd * i) / steps);
    if (point) segment.push(point);
  }

  return segment.length >= 2 ? segment : [];
}

export function buildTrailPaths(
  rings: BoundaryRing[],
  progress: number,
): { path: LngLat[]; regionId: string }[] {
  return rings.map(({ ring, regionId }) => ({
    regionId,
    path: trailSegmentAlongRing(ring, progress),
  }));
}

/** Closed ring → open path safe for Deck.gl PathLayer (no wrap-around chord). */
export function ringToPath(ring: LngLat[]): LngLat[] {
  return sanitizeLngLatPath(openRing(ring));
}
