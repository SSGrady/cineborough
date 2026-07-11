/**
 * OSM / Overpass walkability proxy at ZCTA centroids (ADR-012 / T048).
 * Run: pnpm --filter @cineborough/data ingest:osm-walkability
 *
 * Scoring formula (0–100):
 *   densityScore = min(60, cafe*2 + grocery*5 + park*3 + transit*2) capped per category at 15
 *   diversityScore = (categories with count ≥ 1) / 4 * 40
 *   walkabilityScore = round(clamp(densityScore + diversityScore, 0, 100))
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_SANDBOX_ZIPS } from "../validation.ts";
import type { MetroGeometry } from "../types.ts";
import {
  OSM_ATTRIBUTION,
  OVERPASS_API_URL,
  WALKABILITY_CATEGORIES,
  type OsmWalkabilityNormalizedBundle,
  type OsmWalkabilityZipRecord,
  type WalkabilityCategory,
  type WalkabilityCategoryCounts,
} from "./osm-walkability-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/osm-walkability");
const RAW_DIR = resolve(INGEST_ROOT, "raw/overpass");
const OUT_PATH = resolve(INGEST_ROOT, "normalized/zip-latest.json");
const BOUNDARIES_PATH = resolve(__dirname, "../../../../data/mock/zip-boundaries.geojson");
const TIGERWEB_LAYER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer/2/query";
const OVERPASS_USER_AGENT = "Cineborough/0.1 (sandbox walkability ingest; contact: dev@local)";

const RADIUS_METERS = 1000;
const REQUEST_DELAY_MS = 2500;
const OVERPASS_MAX_RETRIES = 4;
const SCORING_FORMULA =
  "min(100, density(60 max: cafe≤15@2ea, grocery≤15@5ea, park≤15@3ea, transit≤15@2ea) + diversity(40 max: 10/category))";

const CATEGORY_WEIGHTS: Record<WalkabilityCategory, { weight: number; cap: number }> = {
  cafe: { weight: 2, cap: 15 },
  grocery: { weight: 5, cap: 15 },
  park: { weight: 3, cap: 15 },
  transit: { weight: 2, cap: 15 },
};

function geometryCentroid(geometry: MetroGeometry): { lng: number; lat: number } | null {
  if (geometry.type === "Polygon") {
    return polygonCentroid(geometry.coordinates);
  }

  let bestRing: number[][] | null = null;
  let bestLen = 0;
  for (const polygon of geometry.coordinates) {
    const ring = polygon[0];
    if (ring && ring.length > bestLen) {
      bestLen = ring.length;
      bestRing = ring;
    }
  }
  if (!bestRing || bestLen < 2) return null;

  let sumLng = 0;
  let sumLat = 0;
  const n = bestRing.length - 1;
  for (let i = 0; i < n; i++) {
    sumLng += bestRing[i][0];
    sumLat += bestRing[i][1];
  }
  const lng = sumLng / n;
  const lat = sumLat / n;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function polygonCentroid(coordinates: number[][][]): { lng: number; lat: number } {
  const ring = coordinates[0];
  let sumLng = 0;
  let sumLat = 0;
  const n = Math.max(ring.length - 1, 1);
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return { lng: sumLng / n, lat: sumLat / n };
}

function isValidCentroid(centroid: { lat: number; lng: number }): boolean {
  return Number.isFinite(centroid.lat) && Number.isFinite(centroid.lng);
}

function loadCentroidsFromBoundaries(
  zipCodes: readonly string[],
): Map<string, { lat: number; lng: number }> {
  const centroids = new Map<string, { lat: number; lng: number }>();
  if (!existsSync(BOUNDARIES_PATH)) return centroids;

  const geojson = JSON.parse(readFileSync(BOUNDARIES_PATH, "utf8")) as {
    features: Array<{
      properties: { zip: string };
      geometry: MetroGeometry;
    }>;
  };

  const wanted = new Set(zipCodes);

  for (const feature of geojson.features) {
    const zip = feature.properties.zip?.padStart(5, "0");
    if (!zip || !wanted.has(zip)) continue;
    const centroid = geometryCentroid(feature.geometry);
    if (centroid && isValidCentroid(centroid)) centroids.set(zip, centroid);
  }

  return centroids;
}

async function fetchCentroidFromTigerweb(
  zip: string,
): Promise<{ lat: number; lng: number } | null> {
  const url =
    `${TIGERWEB_LAYER}?where=${encodeURIComponent(`ZCTA5='${zip}'`)}` +
    "&outFields=ZCTA5&f=geojson&outSR=4326";

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`TIGERweb ZCTA ${zip}: HTTP ${res.status}`);
    return null;
  }

  const data = (await res.json()) as {
    features?: Array<{ geometry?: MetroGeometry }>;
  };
  const geometry = data.features?.[0]?.geometry;
  if (!geometry) return null;

  const centroid = geometryCentroid(geometry);
  return centroid && isValidCentroid(centroid) ? centroid : null;
}

async function loadCentroids(
  zipCodes: readonly string[],
): Promise<Map<string, { lat: number; lng: number }>> {
  const centroids = loadCentroidsFromBoundaries(zipCodes);

  for (const zip of zipCodes) {
    const existing = centroids.get(zip);
    if (existing && isValidCentroid(existing)) continue;
    console.info(`Fetching TIGERweb centroid for ${zip}...`);
    const fetched = await fetchCentroidFromTigerweb(zip);
    if (fetched) centroids.set(zip, fetched);
    else console.warn(`No centroid for ZCTA ${zip}`);
    await sleep(200);
  }

  return centroids;
}

function buildOverpassQuery(lat: number, lng: number): string {
  return `
[out:json][timeout:30];
(
  node["amenity"~"cafe|restaurant|fast_food"](around:${RADIUS_METERS},${lat},${lng});
  node["shop"~"supermarket|convenience|grocery|greengrocer"](around:${RADIUS_METERS},${lat},${lng});
  node["leisure"="park"](around:${RADIUS_METERS},${lat},${lng});
  way["leisure"="park"](around:${RADIUS_METERS},${lat},${lng});
  node["highway"="bus_stop"](around:${RADIUS_METERS},${lat},${lng});
  node["public_transport"="stop_position"](around:${RADIUS_METERS},${lat},${lng});
  node["railway"~"station|halt|tram_stop|subway_entrance"](around:${RADIUS_METERS},${lat},${lng});
);
out center;
`.trim();
}

function classifyElement(tags: Record<string, string> | undefined): WalkabilityCategory | null {
  if (!tags) return null;

  const amenity = tags.amenity ?? "";
  if (/^(cafe|restaurant|fast_food)$/.test(amenity)) return "cafe";

  const shop = tags.shop ?? "";
  if (/^(supermarket|convenience|grocery|greengrocer)$/.test(shop)) return "grocery";

  if (tags.leisure === "park") return "park";

  const highway = tags.highway ?? "";
  const railway = tags.railway ?? "";
  const publicTransport = tags.public_transport ?? "";
  if (
    highway === "bus_stop" ||
    publicTransport === "stop_position" ||
    /^(station|halt|tram_stop|subway_entrance)$/.test(railway)
  ) {
    return "transit";
  }

  return null;
}

function countCategories(elements: Array<{ tags?: Record<string, string> }>): WalkabilityCategoryCounts {
  const counts: WalkabilityCategoryCounts = { cafe: 0, grocery: 0, park: 0, transit: 0 };

  for (const element of elements) {
    const category = classifyElement(element.tags);
    if (category) counts[category]++;
  }

  return counts;
}

/**
 * Walkability score from amenity density + category diversity within 1 km.
 * Documented in module header and osm-walkability-sources bundle.
 */
export function computeWalkabilityScore(counts: WalkabilityCategoryCounts): {
  walkabilityScore: number;
  categoryDiversity: number;
} {
  let densityScore = 0;
  let categoryDiversity = 0;

  for (const category of WALKABILITY_CATEGORIES) {
    const { weight, cap } = CATEGORY_WEIGHTS[category];
    const count = counts[category];
    if (count > 0) categoryDiversity++;
    densityScore += Math.min(cap, count * weight);
  }

  densityScore = Math.min(60, densityScore);
  const diversityScore = (categoryDiversity / WALKABILITY_CATEGORIES.length) * 40;
  const walkabilityScore = Math.round(Math.min(100, Math.max(0, densityScore + diversityScore)));

  return { walkabilityScore, categoryDiversity };
}

function cachePath(zip: string): string {
  return resolve(RAW_DIR, `${zip}.json`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOverpass(
  zip: string,
  lat: number,
  lng: number,
  useCache: boolean,
): Promise<Array<{ tags?: Record<string, string> }>> {
  const cached = cachePath(zip);
  if (useCache && existsSync(cached)) {
    const parsed = JSON.parse(readFileSync(cached, "utf8")) as {
      elements: Array<{ tags?: Record<string, string> }>;
    };
    return parsed.elements ?? [];
  }

  const query = buildOverpassQuery(lat, lng);

  for (let attempt = 0; attempt < OVERPASS_MAX_RETRIES; attempt++) {
    const res = await fetch(OVERPASS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (res.status === 429 || res.status >= 500) {
      const waitMs = REQUEST_DELAY_MS * (attempt + 2);
      console.warn(`Overpass ${zip} HTTP ${res.status} — retry in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Overpass ${zip} failed: HTTP ${res.status} — ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { elements?: Array<{ tags?: Record<string, string> }> };
    mkdirSync(RAW_DIR, { recursive: true });
    writeFileSync(cached, `${JSON.stringify(json, null, 2)}\n`, "utf8");
    return json.elements ?? [];
  }

  throw new Error(`Overpass ${zip} failed after ${OVERPASS_MAX_RETRIES} retries (rate limited)`);
}

async function ingestZip(
  zip: string,
  centroid: { lat: number; lng: number },
  useCache: boolean,
): Promise<OsmWalkabilityZipRecord> {
  const elements = await fetchOverpass(zip, centroid.lat, centroid.lng, useCache);
  const categoryCounts = countCategories(elements);
  const { walkabilityScore, categoryDiversity } = computeWalkabilityScore(categoryCounts);

  return {
    zipCode: zip,
    walkabilityScore,
    categoryCounts,
    categoryDiversity,
    centroidLat: Math.round(centroid.lat * 1e6) / 1e6,
    centroidLng: Math.round(centroid.lng * 1e6) / 1e6,
    radiusMeters: RADIUS_METERS,
    computedAt: new Date().toISOString(),
  };
}

const args = process.argv.slice(2);
const zipsArg = args.find((a) => a.startsWith("--zips="))?.split("=")[1];
const noCache = args.includes("--no-cache");
const zipCodes = zipsArg
  ? zipsArg.split(",").map((z) => z.trim().padStart(5, "0"))
  : [...ALL_SANDBOX_ZIPS];

const centroids = await loadCentroids(zipCodes);
const records: Record<string, OsmWalkabilityZipRecord> = {};

for (let i = 0; i < zipCodes.length; i++) {
  const zip = zipCodes[i];
  const centroid = centroids.get(zip);
  if (!centroid || !isValidCentroid(centroid)) {
    console.warn(`Skipping ${zip} — no valid centroid`);
    continue;
  }

  if (i > 0) await sleep(REQUEST_DELAY_MS);

  console.info(`Querying Overpass for ${zip} (${centroid.lat}, ${centroid.lng})...`);
  const record = await ingestZip(zip, centroid, !noCache);
  records[zip] = record;
  console.info(
    `  ${zip}: score ${record.walkabilityScore} (cafe ${record.categoryCounts.cafe}, grocery ${record.categoryCounts.grocery}, park ${record.categoryCounts.park}, transit ${record.categoryCounts.transit})`,
  );
}

const bundle: OsmWalkabilityNormalizedBundle = {
  source: "osm-overpass-walkability",
  attribution: OSM_ATTRIBUTION,
  downloadedAt: new Date().toISOString(),
  vintage: new Date().toISOString().slice(0, 10),
  recordCount: Object.keys(records).length,
  scoringFormula: SCORING_FORMULA,
  records,
};

mkdirSync(resolve(INGEST_ROOT, "normalized"), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.info(`Wrote ${OUT_PATH} (${bundle.recordCount} ZCTAs)`);
