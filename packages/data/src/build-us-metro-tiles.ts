/**
 * Builds national metro vector tile source (GeoJSONL + optional PMTiles).
 * Joins all Census CBSA boundaries with mock metrics where available.
 * Run: pnpm --filter @cineborough/data build:us-metro-tiles
 * Requires tippecanoe for PMTiles: brew install tippecanoe
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeOpportunityScore, normalizeScores } from "./opportunity-index.ts";
import type { MetroGeometry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../../data/mock");
const PUBLIC_TILES = resolve(__dirname, "../../../apps/web/public/tiles");
const GEOJSONL = resolve(DATA_DIR, "us-metros-tiles.geojsonl");
const PMTILES = resolve(PUBLIC_TILES, "us-metros.pmtiles");

interface CbsaFeature {
  type: "Feature";
  properties: { GEOID: string; NAME: string };
  geometry: MetroGeometry;
}

interface MetroMetric {
  cbsa: string;
  name: string;
  homePriceForecast1yr: number;
  overvaluationPct: number;
  remoteWorkPct: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function colorForNormalizedScore(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 70) return "#22c55e";
  if (clamped >= 40) return "#eab308";
  return "#ef4444";
}

function shortMetroName(name: string): string {
  return name.split("-")[0].split(",")[0].trim();
}

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

function buildTileFeatures(): Array<{ type: "Feature"; properties: Record<string, string | number>; geometry: MetroGeometry }> {
  const boundaries = JSON.parse(
    readFileSync(resolve(DATA_DIR, "cbsa-boundaries-20m.geojson"), "utf8"),
  ) as { features: CbsaFeature[] };

  const metricsSource = JSON.parse(
    readFileSync(resolve(DATA_DIR, "us-metro-metrics.json"), "utf8"),
  ) as { metros: MetroMetric[] };

  const metricsByCbsa = new Map(metricsSource.metros.map((m) => [m.cbsa, m]));
  const rawScores = boundaries.features.map((f) => {
    const m = metricsByCbsa.get(f.properties.GEOID);
    if (!m) return 50;
    return computeOpportunityScore({
      homePriceForecast1yr: m.homePriceForecast1yr,
      overvaluationPct: m.overvaluationPct,
      remoteWorkPct: m.remoteWorkPct,
    });
  });
  const normalized = normalizeScores(rawScores);

  return boundaries.features.map((feature, i) => {
    const cbsa = feature.properties.GEOID;
    const metric = metricsByCbsa.get(cbsa);
    const score = normalized[i];
    const fillColor = colorForNormalizedScore(score);
    const [fillR, fillG, fillB] = hexToRgb(fillColor);
    const label = metric ? shortMetroName(metric.name) : shortMetroName(feature.properties.NAME);

    return {
      type: "Feature" as const,
      properties: {
        GEOID: cbsa,
        zipCode: cbsa,
        name: label,
        oppNorm: Math.round(score * 10) / 10,
        fillR,
        fillG,
        fillB,
        hasMetric: metric ? 1 : 0,
      },
      geometry: feature.geometry,
    };
  });
}

function writeGeoJsonl(features: ReturnType<typeof buildTileFeatures>): void {
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
    "cbsa",
    "--minimum-zoom=3",
    "--maximum-zoom=10",
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

const features = buildTileFeatures();
writeGeoJsonl(features);
const tiled = runTippecanoe();
console.info(
  tiled
    ? `Tile build complete (${features.length} CBSAs → PMTiles)`
    : `Tile source ready (${features.length} CBSAs → GeoJSONL only)`,
);
