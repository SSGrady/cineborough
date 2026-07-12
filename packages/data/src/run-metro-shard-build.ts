/**
 * Shared metro shard build: mock financials + live Census/ZHVI overlay (ADR-012).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMetroShardGeoJson, type MetroShardBuildInput } from "./build-metro-shard.ts";
import { mergeLiveMetricsIntoZips } from "./ingest/merge-shard-metrics.ts";
import { CATALOG_DIR } from "./metro-catalog/paths.ts";
import type { ZipMetricsInput } from "./validation.ts";
import type { PolygonGeometry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CROSSWALK_PATH = resolve(CATALOG_DIR, "zip-neighborhood-crosswalk.json");

function applyZipNeighborhoodCrosswalk(zips: ZipMetricsInput[]): ZipMetricsInput[] {
  if (!existsSync(CROSSWALK_PATH)) return zips;

  const { records } = JSON.parse(readFileSync(CROSSWALK_PATH, "utf8")) as {
    records?: Record<string, string>;
  };
  if (!records) return zips;

  return zips.map((zip) => {
    const name = records[zip.zip];
    return name ? { ...zip, name } : zip;
  });
}

export interface MetroShardBuildFiles {
  outputPath: string;
  metricsPath: string;
  boundariesPath: string;
  quotesPath: string;
  cbsaCode: string;
}

export function runMetroShardBuild(files: MetroShardBuildFiles): void {
  const boundaries = JSON.parse(
    readFileSync(files.boundariesPath, "utf8"),
  ) as MetroShardBuildInput["boundaries"];

  const metrics = JSON.parse(readFileSync(files.metricsPath, "utf8")) as {
    metro: string;
    cbsaCode?: string;
    zhviMetroRegionId?: string;
    zips: ZipMetricsInput[];
  };

  const quotes = JSON.parse(readFileSync(files.quotesPath, "utf8")) as MetroShardBuildInput["quotes"];

  const merged = mergeLiveMetricsIntoZips(metrics.zips, {
    cbsaCode: files.cbsaCode,
    zhviMetroRegionId: metrics.zhviMetroRegionId,
    cbsaName: metrics.metro,
  });

  const zips = applyZipNeighborhoodCrosswalk(merged.zips);

  const collection = buildMetroShardGeoJson({
    metro: metrics.metro,
    cbsaCode: files.cbsaCode,
    dataAsOf: merged.dataAsOf,
    dataAsOfLabel: merged.dataAsOfLabel,
    zips,
    boundaries,
    quotes,
  });

  writeFileSync(files.outputPath, `${JSON.stringify(collection)}\n`, "utf8");

  const sources = [
    merged.usedCensus ? "Census ACS" : null,
    merged.usedZhvi ? "ZHVI" : null,
    merged.usedFhfa ? "FHFA HPI" : null,
    merged.usedDerivedFinancials ? "derived forecast/overvaluation" : null,
    merged.usedHudFmr ? "HUD FMR cap rate" : null,
    merged.usedRedfin ? "Redfin market trends" : null,
    merged.usedSellerDesperation ? "derived seller desperation" : null,
    merged.usedOsmWalkability ? "OSM walkability" : null,
  ]
    .filter(Boolean)
    .join(" + ");

  console.info(
    `Wrote ${files.outputPath} (${collection.features.length} features` +
      `${sources ? `, live: ${sources}` : ", mock demographics"})`,
  );
}
