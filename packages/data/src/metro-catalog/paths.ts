import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "../../../..");

export const CATALOG_DIR = resolve(REPO_ROOT, "data/catalog");
export const CATALOG_PATH = resolve(CATALOG_DIR, "metro-catalog.json");
export const PROGRESS_PATH = resolve(CATALOG_DIR, "progress.json");
export const STAGING_DIR = resolve(REPO_ROOT, "data/staging");
export const METROS_DIR = resolve(REPO_ROOT, "data/metros");
export const CBSA_BOUNDARIES_PATH = resolve(REPO_ROOT, "data/mock/cbsa-boundaries-20m.geojson");
export const ZHVI_ZIP_PATH = resolve(REPO_ROOT, "data/ingest/zhvi/normalized/zip-latest.json");
export const ZHVI_METRO_PATH = resolve(REPO_ROOT, "data/ingest/zhvi/normalized/metro-latest.json");

export function stagingDirFor(cbsaCode: string): string {
  return resolve(STAGING_DIR, cbsaCode);
}

export function metroShardPath(cbsaCode: string): string {
  return resolve(METROS_DIR, `${cbsaCode}.geojson`);
}
