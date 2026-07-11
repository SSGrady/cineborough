import dcMetroGeoJson from "../../../data/mock/dc-metro.geojson";
import orlandoMetroGeoJson from "../../../data/mock/orlando-metro.geojson";
import type { DcMetroGeoJson } from "./types";
import { DC_METRO_CBSA } from "./us-metros-geojson";

export const ORLANDO_METRO_CBSA = "36740";

const METRO_SHARD_SOURCES: Record<string, DcMetroGeoJson> = {
  [DC_METRO_CBSA]: dcMetroGeoJson as unknown as DcMetroGeoJson,
  [ORLANDO_METRO_CBSA]: orlandoMetroGeoJson as unknown as DcMetroGeoJson,
};

const shardCache = new Map<string, DcMetroGeoJson>();

export interface FetchMetroShardOptions {
  /** API base URL — defaults to NEXT_PUBLIC_METRO_API_BASE_URL when set */
  apiBaseUrl?: string;
}

/**
 * Future API shape (ADR-011):
 * GET {apiBaseUrl}/metros/{cbsa}/geojson → 200 DcMetroGeoJson | 404
 */
export async function fetchMetroShard(
  cbsaCode: string,
  options?: FetchMetroShardOptions,
): Promise<DcMetroGeoJson | undefined> {
  const bundled = loadMetroShard(cbsaCode);
  if (bundled) {
    shardCache.set(cbsaCode, bundled);
    return bundled;
  }

  const cached = shardCache.get(cbsaCode);
  if (cached) return cached;

  const base = options?.apiBaseUrl;
  if (!base) return undefined;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/metros/${cbsaCode}/geojson`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as DcMetroGeoJson;
    shardCache.set(cbsaCode, data);
    return data;
  } catch {
    return undefined;
  }
}

export function clearMetroShardCache(): void {
  shardCache.clear();
}

export function loadMetroShard(cbsaCode: string): DcMetroGeoJson | undefined {
  return METRO_SHARD_SOURCES[cbsaCode];
}

export function loadMetroShardsGeoJson(): DcMetroGeoJson {
  const shards = Object.values(METRO_SHARD_SOURCES);

  return {
    type: "FeatureCollection",
    metadata: {
      metro: "Multi-metro sandbox",
      dataAsOf: shards[0].metadata.dataAsOf,
      dataAsOfLabel: shards[0].metadata.dataAsOfLabel,
      sandboxZips: shards.flatMap((s) => s.metadata.sandboxZips),
      generatedAt: new Date().toISOString().slice(0, 10),
      shards: Object.entries(METRO_SHARD_SOURCES).map(([cbsaCode, shard]) => ({
        cbsaCode,
        metro: shard.metadata.metro,
        sandboxZips: shard.metadata.sandboxZips,
      })),
    },
    features: shards.flatMap((s) => s.features),
  };
}

export function sandboxCbsaForZip(zipCode: string): string | undefined {
  for (const [cbsa, shard] of Object.entries(METRO_SHARD_SOURCES)) {
    if (shard.metadata.sandboxZips.includes(zipCode)) {
      return cbsa;
    }
  }
  return undefined;
}

export { METRO_SHARD_SOURCES };
