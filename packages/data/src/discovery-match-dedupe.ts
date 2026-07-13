import type { DiscoveryCriteria, RankedNeighborhood } from "./hybrid-scoring";
import { compareRankedNeighborhoods } from "./hybrid-scoring";

/** Normalize a match label for dedupe — strips "(Neighborhood)" suffix and ZCTA prefix. */
export function normalizeMatchDisplayName(name: string): string {
  const trimmed = name.trim();
  return trimmed
    .replace(/\s*\([^)]*\)\s*$/i, "")
    .replace(/^zcta\s+/i, "")
    .trim()
    .toLowerCase();
}

/** Stable dedupe key: one row per city/neighborhood display name within a state. */
export function matchDedupeKey(match: Pick<RankedNeighborhood, "name" | "state">): string {
  const state = match.state.trim().toUpperCase() || "??";
  return `${state}|${normalizeMatchDisplayName(match.name)}`;
}

/** Prefer human-readable labels over raw ZCTA codes in the matches list. */
export function preferMatchDisplayName(name: string): string {
  const trimmed = name.trim();
  if (/^zcta\s+\d{5}$/i.test(trimmed)) {
    return trimmed.replace(/^zcta\s+/i, "ZIP ");
  }
  return trimmed.replace(/\s*\([^)]*\)\s*$/i, "").trim() || trimmed;
}

/**
 * Collapse duplicate city names in national discovery results.
 * Keeps the best-ranked row per normalized display name (per state).
 */
export function dedupeRankedMatchesByDisplayName(
  results: RankedNeighborhood[],
  criteria?: DiscoveryCriteria,
): RankedNeighborhood[] {
  const bestByKey = new Map<string, RankedNeighborhood>();

  for (const entry of results) {
    const key = matchDedupeKey(entry);
    const existing = bestByKey.get(key);
    const displayName = preferMatchDisplayName(entry.name);
    const candidate = { ...entry, name: displayName };

    const candidateRanksHigher =
      !existing ||
      (criteria
        ? compareRankedNeighborhoods(candidate, existing, criteria) < 0
        : candidate.matchPercent > existing.matchPercent ||
          (candidate.matchPercent === existing.matchPercent && candidate.score > existing.score));

    if (candidateRanksHigher) {
      bestByKey.set(key, candidate);
    }
  }

  const deduped = [...bestByKey.values()];
  if (criteria) {
    deduped.sort((a, b) => compareRankedNeighborhoods(a, b, criteria));
  } else {
    deduped.sort((a, b) => b.matchPercent - a.matchPercent || b.score - a.score);
  }
  return deduped.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
