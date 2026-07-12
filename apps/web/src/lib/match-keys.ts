import type { RankedNeighborhood } from "@cineborough/data";

/** Stable React key + selection id for nationally ranked neighborhoods (ZIP may repeat across metros). */
export function matchKey(match: Pick<RankedNeighborhood, "zip" | "cbsaCode">): string {
  return `${match.cbsaCode ?? "local"}-${match.zip}`;
}
