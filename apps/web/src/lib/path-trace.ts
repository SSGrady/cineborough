import type { LngLat } from "./selection-border";

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

/** Returns the prefix of a LineString path at even speed for trace-in animation (0→1). */
export function truncateLinePath(path: LngLat[], progress: number): LngLat[] {
  if (path.length < 2) return path;
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped >= 1) return path;
  if (clamped <= 0) return [path[0], path[0]];

  const cumulative: number[] = [0];
  for (let i = 0; i < path.length - 1; i++) {
    cumulative.push(cumulative[i] + segmentLengthMeters(path[i], path[i + 1]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return [path[0], path[0]];

  const target = clamped * total;
  const segment: LngLat[] = [path[0]];

  for (let i = 0; i < path.length - 1; i++) {
    const segEnd = cumulative[i + 1];
    if (segEnd < target) {
      segment.push(path[i + 1]);
      continue;
    }
    const segStart = cumulative[i];
    const segLen = segEnd - segStart;
    const t = segLen < 1e-9 ? 0 : (target - segStart) / segLen;
    const a = path[i];
    const b = path[i + 1];
    segment.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    break;
  }

  return segment.length >= 2 ? segment : [path[0], path[0]];
}
