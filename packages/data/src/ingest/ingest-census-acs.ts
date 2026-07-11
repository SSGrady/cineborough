/**
 * Fetches Census ACS 5-year hope-core demographics for ZCTAs (ADR-012 / T032).
 * Run: CENSUS_API_KEY=... pnpm --filter @cineborough/data ingest:census-acs
 * Key (free): https://api.census.gov/data/key_signup.html
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACS_ATTRIBUTION,
  ACS_HOPE_CORE_VARIABLES,
  ACS_VINTAGE_CURRENT,
  ACS_VINTAGE_PRIOR,
  computeHopeCoreFromAcs,
  parseAcsApiRow,
  type CensusAcsNormalizedBundle,
  type CensusZipDemographics,
} from "./census-acs.ts";
import { SANDBOX_ZIPS } from "../validation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/census-acs");
const OUT_PATH = resolve(INGEST_ROOT, "normalized/zip-latest.json");

function loadDotEnv(): void {
  const envPath = resolve(__dirname, "../../../../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const ORLANDO_SANDBOX_ZIPS = ["32801", "32803", "32804", "32806"] as const;
const DEFAULT_ZIPS = [...SANDBOX_ZIPS, ...ORLANDO_SANDBOX_ZIPS];

export type { CensusAcsNormalizedBundle };

function resolveApiKey(): string {
  const key = process.env.CENSUS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "CENSUS_API_KEY is required. Get a free key at https://api.census.gov/data/key_signup.html",
    );
  }
  return key;
}

async function fetchAcsVintage(
  vintage: string,
  zipCodes: string[],
  apiKey: string,
): Promise<Map<string, ReturnType<typeof parseAcsApiRow>>> {
  const vars = ["NAME", ...ACS_HOPE_CORE_VARIABLES].join(",");
  const geo = zipCodes.map((z) => z).join(",");
  const url =
    `https://api.census.gov/data/${vintage}/acs/acs5` +
    `?get=${vars}&for=zip%20code%20tabulation%20area:${geo}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Census ACS ${vintage} failed: HTTP ${res.status} — ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as string[][];
  const headers = data[0];
  const map = new Map<string, NonNullable<ReturnType<typeof parseAcsApiRow>>>();

  for (let i = 1; i < data.length; i++) {
    const parsed = parseAcsApiRow(headers, data[i]);
    if (parsed) map.set(parsed.zipCode, parsed);
  }

  return map;
}

function parseZipArg(): string[] {
  const arg = process.argv.find((a) => a.startsWith("--zips="));
  if (!arg) return [...DEFAULT_ZIPS];
  return arg
    .slice("--zips=".length)
    .split(",")
    .map((z) => z.trim().padStart(5, "0"))
    .filter((z) => /^\d{5}$/.test(z));
}

const zipCodes = parseZipArg();
const apiKey = resolveApiKey();

console.info(`Fetching ACS for ${zipCodes.length} ZCTAs (${ACS_VINTAGE_CURRENT} + ${ACS_VINTAGE_PRIOR})...`);

const [currentRows, priorRows] = await Promise.all([
  fetchAcsVintage(ACS_VINTAGE_CURRENT, zipCodes, apiKey),
  fetchAcsVintage(ACS_VINTAGE_PRIOR, zipCodes, apiKey),
]);

const records: Record<string, CensusZipDemographics> = {};

for (const zip of zipCodes) {
  const current = currentRows.get(zip);
  if (!current) {
    console.warn(`No ACS row for ZCTA ${zip}`);
    continue;
  }
  const priorPop = priorRows.get(zip)?.population ?? null;
  const demo = computeHopeCoreFromAcs(current, priorPop);
  if (!demo) {
    console.warn(`Could not compute demographics for ZCTA ${zip}`);
    continue;
  }
  records[zip] = demo;
}

const bundle: CensusAcsNormalizedBundle = {
  source: "census-acs-5year",
  attribution: ACS_ATTRIBUTION,
  downloadedAt: new Date().toISOString(),
  vintage: ACS_VINTAGE_CURRENT,
  priorVintage: ACS_VINTAGE_PRIOR,
  recordCount: Object.keys(records).length,
  records,
};

mkdirSync(resolve(INGEST_ROOT, "normalized"), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.info(`Wrote ${OUT_PATH} (${bundle.recordCount} ZCTAs)`);
