import dcMetroGeoJson from "../../../data/metros/47900.geojson";
import orlandoMetroGeoJson from "../../../data/metros/36740.geojson";
import sfBayMetroGeoJson from "../../../data/metros/41860.geojson";
import sanJoseMetroGeoJson from "../../../data/metros/41940.geojson";
import type { DcMetroGeoJson } from "./types";
import { DC_METRO_CBSA } from "./us-metros-geojson";

export const ORLANDO_METRO_CBSA = "36740";
export const SF_METRO_CBSA = "41860";
export const SAN_JOSE_METRO_CBSA = "41940";

const LOCAL_METRO_API_BASE = "/api/v1";

const METRO_SHARD_SOURCES: Record<string, DcMetroGeoJson> = {
  [DC_METRO_CBSA]: dcMetroGeoJson as unknown as DcMetroGeoJson,
  [ORLANDO_METRO_CBSA]: orlandoMetroGeoJson as unknown as DcMetroGeoJson,
  [SF_METRO_CBSA]: sfBayMetroGeoJson as unknown as DcMetroGeoJson,
  [SAN_JOSE_METRO_CBSA]: sanJoseMetroGeoJson as unknown as DcMetroGeoJson,
};

const shardCache = new Map<string, DcMetroGeoJson>();

export interface FetchMetroShardOptions {
  /** API base URL — external override; defaults to local /api/v1 in browser when unset */
  apiBaseUrl?: string;
}

function resolveMetroApiBase(options?: FetchMetroShardOptions): string | undefined {
  if (options?.apiBaseUrl) return options.apiBaseUrl;
  if (typeof window !== "undefined") return LOCAL_METRO_API_BASE;
  return undefined;
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

  const base = resolveMetroApiBase(options);
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
