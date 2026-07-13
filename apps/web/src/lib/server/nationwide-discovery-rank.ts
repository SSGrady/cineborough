import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadUsMetrosGeoJson,
  rankNeighborhoods,
  compareRankedNeighborhoods,
  dedupeRankedMatchesByDisplayName,
  type DiscoveryCriteria,
  type DcMetroGeoJson,
  type RankedNeighborhood,
} from "@cineborough/data";

export const DEFAULT_NATIONAL_DISCOVERY_TOP_N = 100;
export const MAX_METROS_PER_NATIONAL_PASS = 50;

const BUNDLED_SANDBOX_CBSAS = ["47900", "36740", "41860", "41940"];

const METROS_DIR = resolve(process.cwd(), "../../data/metros");

const METRO_CATALOG = loadUsMetrosGeoJson();

export type ViewportBounds = [[number, number], [number, number]];

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
  const path = resolve(metrosDir, `${cbsa}.geojson`);
  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as DcMetroGeoJson;
  } catch {
    return undefined;
  }
}

function cbsaInViewport(cbsa: string, bbox: ViewportBounds): boolean {
  const feature = METRO_CATALOG.features.find((f) => f.properties.zipCode === cbsa);
  if (!feature) return false;
  const { labelLng, labelLat } = feature.properties;
  const [[west, south], [east, north]] = bbox;
  return labelLng >= west && labelLng <= east && labelLat >= south && labelLat <= north;
}

/**
 * Funnel nationwide scoring through metro-level catalog proxies first.
 * Caps full ZIP shard scoring to the top metros (+ any in the current viewport).
 */
export function selectMetrosForNationalScoring(
  scorableCbsas: string[],
  criteria: DiscoveryCriteria,
  options?: {
    viewportBounds?: ViewportBounds;
    maxMetros?: number;
  },
): string[] {
  const maxMetros = options?.maxMetros ?? MAX_METROS_PER_NATIONAL_PASS;
  const scorableSet = new Set(scorableCbsas);

  const catalogFeatures = METRO_CATALOG.features.filter(
    (f) => scorableSet.has(f.properties.zipCode) && f.properties.medianHomeValue > 0,
  );

  if (catalogFeatures.length === 0) {
    return scorableCbsas.slice(0, maxMetros);
  }

  const catalogShard: DcMetroGeoJson = {
    ...METRO_CATALOG,
    features: catalogFeatures,
  };

  const rankedMetros = rankNeighborhoods(catalogShard, criteria, { topN: 0, threshold: 0 });

  const viewportCbsas = options?.viewportBounds
    ? scorableCbsas.filter((cbsa) => cbsaInViewport(cbsa, options.viewportBounds!))
    : [];

  const result: string[] = [];
  const seen = new Set<string>();

  const push = (cbsa: string) => {
    if (result.length >= maxMetros || seen.has(cbsa) || !scorableSet.has(cbsa)) return;
    seen.add(cbsa);
    result.push(cbsa);
  };

  for (const cbsa of viewportCbsas) {
    push(cbsa);
  }

  for (const entry of rankedMetros) {
    push(entry.zip);
  }

  for (const cbsa of scorableCbsas) {
    push(cbsa);
  }

  return result;
}

/**
 * Score neighborhoods across available metro shards, merge, and return top matches.
 * Server-only — reads geojson from disk per metro.
 */
export function rankNationwideNeighborhoods(
  criteria: DiscoveryCriteria,
  options?: {
    metrosDir?: string;
    topN?: number;
    cbsaCodes?: string[];
    viewportBounds?: ViewportBounds;
    maxMetros?: number;
  },
): NationwideDiscoveryResult {
  const metrosDir = options?.metrosDir ?? METROS_DIR;
  const topN = options?.topN ?? DEFAULT_NATIONAL_DISCOVERY_TOP_N;
  const allScorable = options?.cbsaCodes ?? listScorableMetroCbsas(metrosDir);
  const cbsas = selectMetrosForNationalScoring(allScorable, criteria, {
    viewportBounds: options?.viewportBounds,
    maxMetros: options?.maxMetros ?? MAX_METROS_PER_NATIONAL_PASS,
  });

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

  merged.sort((a, b) => compareRankedNeighborhoods(a, b, criteria));

  const deduped = dedupeRankedMatchesByDisplayName(merged, criteria);

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
