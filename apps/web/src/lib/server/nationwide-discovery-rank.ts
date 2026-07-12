import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadMetroShard,
  rankNeighborhoods,
  type DiscoveryCriteria,
  type DcMetroGeoJson,
  type RankedNeighborhood,
} from "@cineborough/data";

export const DEFAULT_NATIONAL_DISCOVERY_TOP_N = 100;

const BUNDLED_SANDBOX_CBSAS = ["47900", "36740", "41860", "41940"];

const METROS_DIR = resolve(process.cwd(), "../../data/metros");

export interface NationwideDiscoveryResult {
  results: RankedNeighborhood[];
  metrosScored: number;
  neighborhoodsScored: number;
}

/** CBSAs with neighborhood shards available for nationwide discovery scoring. */
export function listScorableMetroCbsas(metrosDir = METROS_DIR): string[] {
  const cbsas = new Set<string>(BUNDLED_SANDBOX_CBSAS);
  if (existsSync(metrosDir)) {
    for (const name of readdirSync(metrosDir)) {
      if (/^\d{5}\.geojson$/.test(name)) {
        cbsas.add(name.replace(/\.geojson$/, ""));
      }
    }
  }
  return [...cbsas].sort();
}

function loadShardForCbsa(cbsa: string, metrosDir: string): DcMetroGeoJson | undefined {
  const bundled = loadMetroShard(cbsa);
  if (bundled) return bundled;

  const path = resolve(metrosDir, `${cbsa}.geojson`);
  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as DcMetroGeoJson;
  } catch {
    return undefined;
  }
}

/**
 * Score neighborhoods across all available metro shards, merge, and return top matches.
 * Server-only — reads geojson from disk per metro.
 */
export function rankNationwideNeighborhoods(
  criteria: DiscoveryCriteria,
  options?: {
    metrosDir?: string;
    topN?: number;
    cbsaCodes?: string[];
  },
): NationwideDiscoveryResult {
  const metrosDir = options?.metrosDir ?? METROS_DIR;
  const topN = options?.topN ?? DEFAULT_NATIONAL_DISCOVERY_TOP_N;
  const cbsas = options?.cbsaCodes ?? listScorableMetroCbsas(metrosDir);

  const merged: RankedNeighborhood[] = [];
  let neighborhoodsScored = 0;
  let metrosScored = 0;

  for (const cbsa of cbsas) {
    const shard = loadShardForCbsa(cbsa, metrosDir);
    if (!shard?.features?.length) continue;

    neighborhoodsScored += shard.features.length;
    metrosScored += 1;

    const ranked = rankNeighborhoods(shard, criteria, { topN: 0 });
    for (const entry of ranked) {
      merged.push({
        ...entry,
        cbsaCode: cbsa,
        metroName: shard.metadata.metro,
      });
    }
  }

  merged.sort((a, b) => b.matchPercent - a.matchPercent || b.score - a.score);

  const seen = new Set<string>();
  const deduped: RankedNeighborhood[] = [];
  for (const entry of merged) {
    const key = `${entry.cbsaCode ?? "local"}-${entry.zip}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  const results = deduped.slice(0, topN).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return { results, metrosScored, neighborhoodsScored };
}

/** Rank a single metro shard (server-side). */
export function rankMetroNeighborhoods(
  cbsa: string,
  criteria: DiscoveryCriteria,
  options?: { metrosDir?: string; topN?: number },
): NationwideDiscoveryResult {
  const metrosDir = options?.metrosDir ?? METROS_DIR;
  const topN = options?.topN ?? DEFAULT_NATIONAL_DISCOVERY_TOP_N;
  const shard = loadShardForCbsa(cbsa, metrosDir);
  if (!shard?.features?.length) {
    return { results: [], metrosScored: 0, neighborhoodsScored: 0 };
  }

  const ranked = rankNeighborhoods(shard, criteria, { topN: 0 });
  const results = ranked.slice(0, topN).map((entry, index) => ({
    ...entry,
    cbsaCode: cbsa,
    metroName: shard.metadata.metro,
    rank: index + 1,
  }));

  return {
    results,
    metrosScored: 1,
    neighborhoodsScored: shard.features.length,
  };
}
