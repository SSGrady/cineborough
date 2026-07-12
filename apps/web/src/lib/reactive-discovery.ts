import type { DiscoveryCriteria, RankedNeighborhood } from "@cineborough/data";

export interface DiscoveryRankResponse {
  results: RankedNeighborhood[];
  metrosScored: number;
  neighborhoodsScored: number;
  scope: "national" | "metro";
}

export function criteriaHash(criteria: DiscoveryCriteria): string {
  return JSON.stringify(
    criteria.filters.map((f) => ({
      id: f.id,
      metric: f.metric,
      min: f.min,
      max: f.max,
      priority: f.priority,
      sortMode: f.sortMode,
    })),
  );
}

export async function fetchDiscoveryRank(
  criteria: DiscoveryCriteria,
  options?: {
    scope?: "national" | "metro";
    cbsaCode?: string;
    topN?: number;
    signal?: AbortSignal;
    viewportBounds?: [[number, number], [number, number]];
  },
): Promise<DiscoveryRankResponse> {
  const res = await fetch("/api/v1/discovery/rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      criteria,
      topN: options?.topN,
      cbsaCode: options?.cbsaCode,
      scope: options?.scope ?? (options?.cbsaCode ? "metro" : "national"),
      viewportBounds: options?.viewportBounds,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Discovery ranking failed");
  }

  return res.json() as Promise<DiscoveryRankResponse>;
}
