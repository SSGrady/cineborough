/**
 * Fetches simplified continental US county polygons from Census TIGERweb.
 * Excludes AK, HI, and territories. Output matches sandbox-counties schema.
 * Run: node --experimental-strip-types src/scripts/fetch-us-counties.ts
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

const TIGERWEB_LAYER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer/82/query";

/** Continental lower-48 + DC — exclude AK, HI, territories */
const CONTINENTAL_WHERE =
  "STATE NOT IN ('02','15','60','66','69','72','78')";

const PAGE_SIZE = 500;

interface TigerFeature {
  type: "Feature";
  properties: { GEOID: string; NAME: string; STATE: string };
  geometry: GeoJSON.Geometry;
}

async function fetchPage(offset: number): Promise<TigerFeature[]> {
  const params = new URLSearchParams({
    where: CONTINENTAL_WHERE,
    outFields: "GEOID,NAME,STATE",
    f: "geojson",
    outSR: "4326",
    maxAllowableOffset: "0.02",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  });

  const res = await fetch(`${TIGERWEB_LAYER}?${params}`);
  if (!res.ok) {
    throw new Error(`TIGERweb counties offset ${offset}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeoJSON.FeatureCollection;
  return (data.features ?? []) as TigerFeature[];
}

const features: GeoJSON.Feature[] = [];
let offset = 0;

while (true) {
  console.info(`Fetching counties offset ${offset}...`);
  const page = await fetchPage(offset);
  if (page.length === 0) break;

  for (const raw of page) {
    const geoid = raw.properties.GEOID;
    features.push({
      type: "Feature",
      id: geoid,
      properties: {
        geoid,
        name: raw.properties.NAME,
        stateFips: raw.properties.STATE,
      },
      geometry: raw.geometry,
    });
  }

  offset += page.length;
  if (page.length < PAGE_SIZE) break;
}

const collection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features,
};

const outPath = resolve(REPO_ROOT, "data/boundaries/us-counties-20m.geojson");
writeFileSync(outPath, JSON.stringify(collection));
console.info(`Wrote ${features.length} counties to ${outPath}`);
