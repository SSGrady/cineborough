import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ZhviZipRecord } from "../ingest/zhvi-sources.ts";
import { CATALOG_DIR } from "./paths.ts";
import { metroStem } from "./zhvi-lookup.ts";

const CROSSWALK_PATH = resolve(CATALOG_DIR, "zip-neighborhood-crosswalk.json");

interface ZipNeighborhoodCrosswalk {
  records: Record<string, string>;
}

let cachedCrosswalk: Record<string, string> | null = null;

function loadCrosswalk(): Record<string, string> {
  if (cachedCrosswalk) return cachedCrosswalk;
  if (!existsSync(CROSSWALK_PATH)) {
    cachedCrosswalk = {};
    return cachedCrosswalk;
  }
  const bundle = JSON.parse(readFileSync(CROSSWALK_PATH, "utf8")) as ZipNeighborhoodCrosswalk;
  cachedCrosswalk = bundle.records ?? {};
  return cachedCrosswalk;
}

/** Count how many ZCTAs in a metro share the same ZHVI city label. */
export function cityNameCounts(records: ZhviZipRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const city = record.city?.trim();
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return counts;
}

/**
 * True when ZHVI's city field is too coarse for neighborhood labels
 * (e.g. 56 Chicago ZCTAs all labeled "Chicago").
 */
export function isAmbiguousCityLabel(
  city: string,
  cbsaName: string,
  cityCounts: Map<string, number>,
): boolean {
  const count = cityCounts.get(city) ?? 0;
  if (count <= 1) return false;

  const stem = metroStem(cbsaName).split("-")[0];
  const cityLower = city.toLowerCase();
  if (cityLower === stem) return true;

  // "New York" in NYC metro, "Los Angeles" in LA metro, etc.
  const base = cbsaName.split(",")[0].split("-")[0].trim().toLowerCase();
  return cityLower === base;
}

/**
 * Resolve a display name for a ZCTA. Uses curated crosswalk when ZHVI city
 * is ambiguous; otherwise city from ZHVI or ZCTA fallback.
 */
export function resolveZipDisplayName(
  record: ZhviZipRecord,
  cbsaName: string,
  cityCounts: Map<string, number>,
  crosswalk?: Record<string, string>,
): string {
  const lookup = crosswalk ?? loadCrosswalk();
  const crosswalkName = lookup[record.zipCode];
  if (crosswalkName) return crosswalkName;

  const city = record.city?.trim();
  if (city && !isAmbiguousCityLabel(city, cbsaName, cityCounts)) {
    return city;
  }

  return `ZCTA ${record.zipCode}`;
}

export function clearZipNeighborhoodCrosswalkCache(): void {
  cachedCrosswalk = null;
}
