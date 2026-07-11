/**
 * Regenerates data/metros/47900.geojson from boundaries, metrics, and locale quotes.
 * Run: pnpm --filter @cineborough/data build:geojson
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMetroShardGeoJson } from "./build-metro-shard.ts";
import type { ZipMetricsInput } from "./validation.ts";
import type { PolygonGeometry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const METROS_DIR = resolve(__dirname, "../../../data/metros");
const OUTPUT = resolve(METROS_DIR, "47900.geojson");

const boundaries = JSON.parse(
  readFileSync(resolve(DATA_DIR, "zip-boundaries.geojson"), "utf8"),
) as { features: Array<{ type: "Feature"; properties: { zip: string; name: string }; geometry: PolygonGeometry }> };

const metrics = JSON.parse(
  readFileSync(resolve(DATA_DIR, "zip-metrics.json"), "utf8"),
) as { metro: string; zips: ZipMetricsInput[] };

const localeQuotes = JSON.parse(
  readFileSync(resolve(DATA_DIR, "locale-quotes.json"), "utf8"),
) as { quotes: Array<{ zip: string; text: string; primaryVibe?: string }> };

const collection = buildMetroShardGeoJson({
  metro: metrics.metro,
  cbsaCode: "47900",
  zips: metrics.zips,
  boundaries,
  quotes: localeQuotes,
});

writeFileSync(OUTPUT, `${JSON.stringify(collection)}\n`, "utf8");
console.info(`Wrote ${OUTPUT} (${collection.features.length} features)`);
