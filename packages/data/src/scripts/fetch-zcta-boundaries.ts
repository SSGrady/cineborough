/**
 * Fetches Census TIGER/Line ZCTA polygons for sandbox ZIPs (T010 pattern).
 * Run: node --experimental-strip-types src/scripts/fetch-zcta-boundaries.ts --zips=22201,32801 --out=data/mock/zip-boundaries.geojson
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

const TIGERWEB_LAYER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer/2/query";

interface ZipEntry {
  zip: string;
  name: string;
}

async function fetchZcta(zip: string): Promise<GeoJSON.Feature | null> {
  const url =
    `${TIGERWEB_LAYER}?where=${encodeURIComponent(`ZCTA5='${zip}'`)}` +
    "&outFields=ZCTA5&f=geojson&outSR=4326";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TIGERweb ZCTA ${zip}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeoJSON.FeatureCollection;
  const feature = data.features?.[0];
  if (!feature?.geometry) {
    console.warn(`No geometry for ZCTA ${zip}`);
    return null;
  }

  return feature;
}

function parseArgs(): { zips: ZipEntry[]; outPath: string } {
  const zipsArg = process.argv.find((a) => a.startsWith("--zips="));
  const namesArg = process.argv.find((a) => a.startsWith("--names="));
  const outArg = process.argv.find((a) => a.startsWith("--out="));

  if (!zipsArg || !outArg) {
    throw new Error("Usage: --zips=22201,22202 --names=Arlington (Clarendon),... --out=data/mock/zip-boundaries.geojson");
  }

  const zipCodes = zipsArg
    .slice("--zips=".length)
    .split(",")
    .map((z) => z.trim().padStart(5, "0"));

  const names = namesArg
    ? namesArg.slice("--names=".length).split("|").map((n) => n.trim())
    : zipCodes.map((z) => `ZCTA ${z}`);

  if (names.length !== zipCodes.length) {
    throw new Error("--names count must match --zips count (use | as separator)");
  }

  const outPath = resolve(REPO_ROOT, outArg.slice("--out=".length));
  const zips = zipCodes.map((zip, i) => ({ zip, name: names[i] }));

  return { zips, outPath };
}

const { zips, outPath } = parseArgs();

const features: GeoJSON.Feature[] = [];

for (const entry of zips) {
  console.info(`Fetching ZCTA ${entry.zip}...`);
  const raw = await fetchZcta(entry.zip);
  if (!raw) continue;

  features.push({
    type: "Feature",
    properties: { zip: entry.zip, name: entry.name },
    geometry: raw.geometry,
  });
}

const collection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  metadata: {
    source: "US Census Bureau TIGER/Line 2020 ZCTA (via TIGERweb MapServer)",
    retrieved: new Date().toISOString().slice(0, 10),
    sandboxZips: zips.map((z) => z.zip),
  } as GeoJSON.GeoJsonProperties,
  features,
};

writeFileSync(outPath, `${JSON.stringify(collection)}\n`, "utf8");
console.info(`Wrote ${outPath} (${features.length} features)`);
