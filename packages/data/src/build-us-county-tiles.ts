/**
 * Builds national county vector tile source (GeoJSONL + optional PMTiles).
 * Joins continental county boundaries with metro-aggregated metrics.
 * Run: pnpm --filter @cineborough/data build:us-county-tiles
 * Requires tippecanoe for PMTiles: brew install tippecanoe
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadUsMetrosGeoJson } from "./us-metros-geojson.ts";
import { buildCountyChoroplethFromMetros } from "./us-counties.ts";
import type { MetroGeometry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const PUBLIC_TILES = resolve(__dirname, "../../../apps/web/public/tiles");
const GEOJSONL = resolve(DATA_DIR, "us-counties-tiles.geojsonl");
const PMTILES = resolve(PUBLIC_TILES, "us-counties.pmtiles");

function findTippecanoe(): string | null {
  const candidates = [
    process.env.TIPPECANOE_BIN,
    "tippecanoe",
    "/opt/homebrew/bin/tippecanoe",
    "/usr/local/bin/tippecanoe",
  ].filter(Boolean) as string[];

  for (const bin of candidates) {
    const probe = spawnSync(bin, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  return null;
}

function writeGeoJsonl(
  features: Array<{ type: "Feature"; properties: Record<string, string | number>; geometry: MetroGeometry }>,
): void {
  const lines = features.map((f) => JSON.stringify(f));
  writeFileSync(GEOJSONL, `${lines.join("\n")}\n`, "utf8");
  console.info(`Wrote ${GEOJSONL} (${features.length} features)`);
}

function runTippecanoe(): boolean {
  const bin = findTippecanoe();
  if (!bin) {
    console.warn(
      "tippecanoe not found — GeoJSONL only. Install: brew install tippecanoe",
    );
    return false;
  }

  mkdirSync(PUBLIC_TILES, { recursive: true });

  const args = [
    "-o",
    PMTILES,
    "-l",
    "county",
    "--minimum-zoom=4",
    "--maximum-zoom=12",
    "--drop-densest-as-needed",
    "--extend-zooms-if-still-dropping",
    "--force",
    "-y",
    "GEOID",
    "-y",
    "zipCode",
    "-y",
    "name",
    "-y",
    "oppNorm",
    "-y",
    "fillR",
    "-y",
    "fillG",
    "-y",
    "fillB",
    "-y",
    "hasMetric",
    GEOJSONL,
  ];

  const result = spawnSync(bin, args, { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    console.error("tippecanoe failed:", result.stderr || result.stdout);
    return false;
  }

  console.info(`Wrote ${PMTILES}`);
  return true;
}

const metros = loadUsMetrosGeoJson();
const choropleth = buildCountyChoroplethFromMetros(metros, "opportunityScore");

const features = choropleth.features.map((feature) => {
  const props = feature.properties;
  const [fillR, fillG, fillB] = props.fillColorRgb;
  return {
    type: "Feature" as const,
    properties: {
      GEOID: props.zipCode,
      zipCode: props.zipCode,
      name: props.neighborhoodName,
      oppNorm: Math.round(props.opportunityScore * 10) / 10,
      fillR,
      fillG,
      fillB,
      hasMetric: props.medianHomeValue > 0 ? 1 : 0,
    },
    geometry: feature.geometry,
  };
});

writeGeoJsonl(features);
const tiled = runTippecanoe();
console.info(
  tiled
    ? `Tile build complete (${features.length} counties → PMTiles)`
    : `Tile source ready (${features.length} counties → GeoJSONL only)`,
);
