/**
 * Regenerates data/metros/36740.geojson from Orlando mock inputs.
 * Run: pnpm --filter @cineborough/data build:orlando-geojson
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
const OUTPUT = resolve(METROS_DIR, "36740.geojson");

const metrics = JSON.parse(
  readFileSync(resolve(DATA_DIR, "orlando-zip-metrics.json"), "utf8"),
) as { metro: string; cbsaCode: string; zips: ZipMetricsInput[] };

const boundaries = JSON.parse(
  readFileSync(resolve(DATA_DIR, "orlando-zip-boundaries.geojson"), "utf8"),
) as {
  features: Array<{
    type: "Feature";
    properties: { zip: string; name: string };
    geometry: PolygonGeometry;
  }>;
};

const quotes = JSON.parse(
  readFileSync(resolve(DATA_DIR, "orlando-locale-quotes.json"), "utf8"),
) as { quotes: Array<{ zip: string; text: string; primaryVibe?: string }> };

const collection = buildMetroShardGeoJson({
  metro: metrics.metro,
  cbsaCode: metrics.cbsaCode,
  zips: metrics.zips,
  boundaries,
  quotes,
});

writeFileSync(OUTPUT, `${JSON.stringify(collection)}\n`, "utf8");
console.info(`Wrote ${OUTPUT} (${collection.features.length} features)`);
