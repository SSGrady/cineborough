/**
 * Regenerates data/metros/41940.geojson from San Jose mock inputs + live ingest overlay.
 * Run: pnpm --filter @cineborough/data build:san-jose-geojson
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMetroShardBuild } from "./run-metro-shard-build.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const METROS_DIR = resolve(__dirname, "../../../data/metros");

runMetroShardBuild({
  outputPath: resolve(METROS_DIR, "41940.geojson"),
  metricsPath: resolve(DATA_DIR, "san-jose-zip-metrics.json"),
  boundariesPath: resolve(DATA_DIR, "san-jose-zip-boundaries.geojson"),
  quotesPath: resolve(DATA_DIR, "san-jose-locale-quotes.json"),
  cbsaCode: "41940",
});
