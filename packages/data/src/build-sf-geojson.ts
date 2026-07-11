/**
 * Regenerates data/metros/41860.geojson from SF Bay mock inputs + live ingest overlay.
 * Run: pnpm --filter @cineborough/data build:sf-geojson
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMetroShardBuild } from "./run-metro-shard-build.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const METROS_DIR = resolve(__dirname, "../../../data/metros");

runMetroShardBuild({
  outputPath: resolve(METROS_DIR, "41860.geojson"),
  metricsPath: resolve(DATA_DIR, "sf-bay-zip-metrics.json"),
  boundariesPath: resolve(DATA_DIR, "sf-bay-zip-boundaries.geojson"),
  quotesPath: resolve(DATA_DIR, "sf-bay-locale-quotes.json"),
  cbsaCode: "41860",
});
