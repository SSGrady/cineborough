import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZipMetricsInput } from "../validation.ts";
import type { CensusAcsNormalizedBundle } from "./census-acs.ts";
import type { ZhviNormalizedBundle, ZhviZipRecord } from "./zhvi-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest");

export interface LiveIngestPaths {
  censusAcs: string;
  zhviZip: string;
}

export const DEFAULT_INGEST_PATHS: LiveIngestPaths = {
  censusAcs: resolve(INGEST_ROOT, "census-acs/normalized/zip-latest.json"),
  zhviZip: resolve(INGEST_ROOT, "zhvi/normalized/zip-latest.json"),
};

export interface MergeLiveMetricsResult {
  zips: ZipMetricsInput[];
  usedCensus: boolean;
  usedZhvi: boolean;
  dataAsOf: string;
  dataAsOfLabel: string;
}

function loadJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/**
 * Overlays live Census hope-core + ZHVI home values onto base shard metrics.
 * Falls back to base fields when ingest files are missing.
 */
export function mergeLiveMetricsIntoZips(
  baseZips: ZipMetricsInput[],
  paths: LiveIngestPaths = DEFAULT_INGEST_PATHS,
): MergeLiveMetricsResult {
  const census = loadJsonIfExists<CensusAcsNormalizedBundle>(paths.censusAcs);
  const zhvi = loadJsonIfExists<ZhviNormalizedBundle>(paths.zhviZip);

  let usedCensus = false;
  let usedZhvi = false;

  const zips = baseZips.map((zip) => {
    const merged = { ...zip };
    const demo = census?.records[zip.zip];
    if (demo) {
      usedCensus = true;
      merged.remoteWorkPct = demo.remoteWorkPct;
      merged.homeowners25to44Pct = demo.homeowners25to44Pct;
      merged.populationGrowthRate = demo.populationGrowthRate;
      merged.medianAge = demo.medianAge;
      merged.collegeDegreeRate = demo.collegeDegreeRate;
    }

    const zhviRec = zhvi?.records[zip.zip] as ZhviZipRecord | undefined;
    if (zhviRec) {
      usedZhvi = true;
      merged.medianHomeValue = zhviRec.zhvi;
      if (zhviRec.zhviYoyPct !== null) {
        merged.homeValueGrowthYoy = Math.round(zhviRec.zhviYoyPct * 10) / 10;
      }
    }

    return merged;
  });

  const dataAsOf = census?.vintage ?? zhvi?.vintage ?? "mock";
  const dataAsOfLabel = census
    ? `ACS ${census.vintage} + ZHVI ${zhvi?.vintage ?? "n/a"}`
    : zhvi
      ? `ZHVI ${zhvi.vintage}`
      : "May 2026";

  if (!usedCensus) {
    console.warn(
      `Census demographics not applied — run ingest:census-acs (missing ${paths.censusAcs})`,
    );
  }
  if (!usedZhvi) {
    console.warn(
      `ZHVI home values not applied — run ingest:zhvi --only=zip (missing ${paths.zhviZip})`,
    );
  }

  return { zips, usedCensus, usedZhvi, dataAsOf, dataAsOfLabel };
}
