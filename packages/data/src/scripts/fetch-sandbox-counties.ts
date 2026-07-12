/**
 * Fetches Census TIGER county polygons for sandbox metros (VA/MD/DC/FL/CA).
 * Run: node --experimental-strip-types src/scripts/fetch-sandbox-counties.ts
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

const TIGERWEB_LAYER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer/82/query";

/** Counties intersecting sandbox metros — see zip-to-county.ts */
const SANDBOX_COUNTY_FIPS = [
  "11001", // DC
  "51013", // Arlington, VA
  "51510", // Alexandria city, VA
  "24031", // Montgomery, MD
  "12095", // Orange, FL
  "12097", // Osceola, FL
  "06075", // San Francisco, CA
  "06001", // Alameda, CA
  "06013", // Contra Costa, CA
  "06085", // Santa Clara, CA
];

const COUNTY_NAMES: Record<string, string> = {
  "11001": "District of Columbia",
  "51013": "Arlington",
  "51510": "Alexandria",
  "24031": "Montgomery",
  "12095": "Orange",
  "12097": "Osceola",
  "06075": "San Francisco",
  "06001": "Alameda",
  "06013": "Contra Costa",
  "06085": "Santa Clara",
};

async function fetchCounty(geoid: string): Promise<GeoJSON.Feature | null> {
  const url =
    `${TIGERWEB_LAYER}?where=${encodeURIComponent(`GEOID='${geoid}'`)}` +
    "&outFields=GEOID,NAME&f=geojson&outSR=4326";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TIGERweb county ${geoid}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeoJSON.FeatureCollection;
  const feature = data.features?.[0];
  if (!feature?.geometry) {
    console.warn(`No geometry for county GEOID ${geoid}`);
    return null;
  }

  return feature;
}

const features: GeoJSON.Feature[] = [];

for (const geoid of SANDBOX_COUNTY_FIPS) {
  console.info(`Fetching county ${geoid}...`);
  const raw = await fetchCounty(geoid);
  if (!raw) continue;

  features.push({
    type: "Feature",
    id: geoid,
    properties: {
      geoid,
      name: COUNTY_NAMES[geoid] ?? raw.properties?.NAME ?? geoid,
    },
    geometry: raw.geometry,
  });
}

const collection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features,
};

const outPath = resolve(REPO_ROOT, "data/boundaries/sandbox-counties.geojson");
writeFileSync(outPath, JSON.stringify(collection));
console.info(`Wrote ${features.length} counties to ${outPath}`);
