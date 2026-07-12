/**
 * T089 extended criterion metrics — mock/derived values for sandbox shards.
 * See docs/schema/metrics-taxonomy.md and docs/specifications/wishlist-discovery.md §T075.
 */

export interface ExtendedCriterionMetrics {
  parkScoreProxy: number;
  physiciansPer10k: number;
  schoolRatingPlaceholder: number;
  airportDriveMin: number;
}

/** Deterministic sandbox mock from ZIP + walk score (until live OSM/ACS ingest). */
export function deriveExtendedMetrics(
  zip: string,
  walkabilityScore: number,
): ExtendedCriterionMetrics {
  const seed =
    zip.charCodeAt(0) + zip.charCodeAt(2) + zip.charCodeAt(4) + Math.round(walkabilityScore);
  const parkScoreProxy = Math.min(
    100,
    Math.round((seed % 7) * 11 + walkabilityScore * 0.35 + (zip.charCodeAt(1) % 5) * 4),
  );
  const physiciansPer10k = Math.round(12 + (seed % 28) + (zip.charCodeAt(3) % 6));
  const schoolRatingPlaceholder = Math.round((4 + (seed % 55) / 10) * 10) / 10;
  const airportDriveMin = Math.round(12 + (seed % 48) + (zip.charCodeAt(2) % 8));
  return {
    parkScoreProxy,
    physiciansPer10k,
    schoolRatingPlaceholder,
    airportDriveMin,
  };
}
