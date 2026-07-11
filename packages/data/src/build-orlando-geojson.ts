/**
 * Regenerates data/metros/36740.geojson from Orlando mock inputs + live ingest overlay.
 * Run: pnpm --filter @cineborough/data build:orlando-geojson
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMetroShardBuild } from "./run-metro-shard-build.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const METROS_DIR = resolve(__dirname, "../../../data/metros");

runMetroShardBuild({
  outputPath: resolve(METROS_DIR, "36740.geojson"),
  metricsPath: resolve(DATA_DIR, "orlando-zip-metrics.json"),
  boundariesPath: resolve(DATA_DIR, "orlando-zip-boundaries.geojson"),
  quotesPath: resolve(DATA_DIR, "orlando-locale-quotes.json"),
  cbsaCode: "36740",
});
