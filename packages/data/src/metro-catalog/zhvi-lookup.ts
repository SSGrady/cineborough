import { readFileSync } from "node:fs";
import type { ZhviNormalizedBundle } from "../ingest/zhvi-sources.ts";
import { ZHVI_METRO_PATH } from "./paths.ts";

/** Normalize CBSA / ZHVI metro names for fuzzy matching. */
export function normalizeMetroName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+msa$/i, "")
    .replace(/\s+metro$/i, "")
    .replace(/[,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Primary corridor token — first two hyphen segments before state suffix. */
export function metroStem(name: string): string {
  const base = name.split(",")[0].trim();
  const parts = base.split("-");
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`.toLowerCase();
  return parts[0].toLowerCase();
}

let cachedZhviMetroByName: Map<string, string> | null = null;

/** Build CBSA name → ZHVI regionId map from metro-latest.json. */
export function buildZhviMetroRegionMap(zhviMetro?: ZhviNormalizedBundle): Map<string, string> {
  if (cachedZhviMetroByName) return cachedZhviMetroByName;

  const bundle =
    zhviMetro ??
    (JSON.parse(readFileSync(ZHVI_METRO_PATH, "utf8")) as ZhviNormalizedBundle);

  const map = new Map<string, string>();
  for (const [regionId, record] of Object.entries(bundle.records)) {
    const metroRecord = record as { name: string };
    const key = normalizeMetroName(metroRecord.name);
    if (!map.has(key)) {
      map.set(key, regionId);
    }
  }

  cachedZhviMetroByName = map;
  return map;
}

export function resolveZhviMetroRegionId(
  cbsaName: string,
  zhviMetroByName?: Map<string, string>,
  zhviMetroStems?: Map<string, string>,
): string | undefined {
  const map = zhviMetroByName ?? buildZhviMetroRegionMap();
  const direct = map.get(normalizeMetroName(cbsaName));
  if (direct) return direct;

  const stems = zhviMetroStems ?? buildZhviMetroStemMap();
  return stems.get(metroStem(cbsaName));
}

let cachedZhviMetroStems: Map<string, string> | null = null;

/** Stem (first two segments) → ZHVI regionId for Census/ZHVI name mismatches. */
export function buildZhviMetroStemMap(zhviMetro?: ZhviNormalizedBundle): Map<string, string> {
  if (cachedZhviMetroStems) return cachedZhviMetroStems;

  const bundle =
    zhviMetro ??
    (JSON.parse(readFileSync(ZHVI_METRO_PATH, "utf8")) as ZhviNormalizedBundle);

  const map = new Map<string, string>();
  for (const [regionId, record] of Object.entries(bundle.records)) {
    const metroRecord = record as { name: string };
    const stem = metroStem(metroRecord.name);
    if (!map.has(stem)) map.set(stem, regionId);
  }

  cachedZhviMetroStems = map;
  return map;
}

export function clearZhviMetroCache(): void {
  cachedZhviMetroByName = null;
  cachedZhviMetroStems = null;
}
