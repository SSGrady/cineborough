/**
 * Shared metro shard build: mock financials + live Census/ZHVI overlay (ADR-012).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMetroShardGeoJson, type MetroShardBuildInput } from "./build-metro-shard.ts";
import { mergeLiveMetricsIntoZips } from "./ingest/merge-shard-metrics.ts";
import type { ZipMetricsInput } from "./validation.ts";
import type { PolygonGeometry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    zips: ZipMetricsInput[];
  };

  const quotes = JSON.parse(readFileSync(files.quotesPath, "utf8")) as MetroShardBuildInput["quotes"];

  const merged = mergeLiveMetricsIntoZips(metrics.zips, { cbsaCode: files.cbsaCode });

  const collection = buildMetroShardGeoJson({
    metro: metrics.metro,
    cbsaCode: files.cbsaCode,
    dataAsOf: merged.dataAsOf,
    dataAsOfLabel: merged.dataAsOfLabel,
    zips: merged.zips,
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
  ]
    .filter(Boolean)
    .join(" + ");

  console.info(
    `Wrote ${files.outputPath} (${collection.features.length} features` +
      `${sources ? `, live: ${sources}` : ", mock demographics"})`,
  );
}
