/**
 * Regenerates data/metros/47900.geojson from boundaries, metrics, locale quotes,
 * and live Census ACS + ZHVI overlays when present.
 * Run: pnpm --filter @cineborough/data build:geojson
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMetroShardBuild } from "./run-metro-shard-build.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const METROS_DIR = resolve(__dirname, "../../../data/metros");

runMetroShardBuild({
  outputPath: resolve(METROS_DIR, "47900.geojson"),
  metricsPath: resolve(DATA_DIR, "zip-metrics.json"),
  boundariesPath: resolve(DATA_DIR, "zip-boundaries.geojson"),
  quotesPath: resolve(DATA_DIR, "locale-quotes.json"),
  cbsaCode: "47900",
});
