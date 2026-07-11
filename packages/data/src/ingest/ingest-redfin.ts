/**
 * Downloads and normalizes Redfin market tracker bulk TSV (ADR-012 / T046).
 * Run: pnpm --filter @cineborough/data ingest:redfin
 */
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { ALL_SANDBOX_ZIPS } from "../validation.ts";
import {
  REDFIN_ALL_RESIDENTIAL_PROPERTY_TYPE,
  REDFIN_ATTRIBUTION,
  REDFIN_MARKET_TRACKER_URLS,
  REDFIN_MONTHLY_PERIOD_DURATIONS,
  type RedfinGeography,
  type RedfinNormalizedBundle,
  type RedfinZipRecord,
} from "./redfin-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/redfin");
const RAW_DIR = resolve(INGEST_ROOT, "raw");
const OUT_DIR = resolve(INGEST_ROOT, "normalized");

const ZIP_REGION_RE = /Zip Code:\s*(\d{5})/i;

function parseTsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '"') {
      const end = line.indexOf('"', i + 1);
      fields.push(line.slice(i + 1, end >= 0 ? end : line.length));
      i = end >= 0 ? end + 2 : line.length;
      continue;
    }
    const tab = line.indexOf("\t", i);
    const end = tab === -1 ? line.length : tab;
    fields.push(line.slice(i, end));
    i = tab === -1 ? line.length : tab + 1;
  }

  return fields;
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "" || value === "NA") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizePeriodDuration(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isMonthlyPeriod(value: string | undefined): boolean {
  const normalized = normalizePeriodDuration(value);
  return REDFIN_MONTHLY_PERIOD_DURATIONS.has(normalized);
}

function extractZipCode(region: string): string | null {
  const match = ZIP_REGION_RE.exec(region);
  return match ? match[1] : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function downloadGzip(geography: RedfinGeography): Promise<string> {
  const url = REDFIN_MARKET_TRACKER_URLS[geography];
  const dest = resolve(RAW_DIR, `zip_code_market_tracker.tsv000.gz`);

  mkdirSync(RAW_DIR, { recursive: true });

  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Redfin download failed (${geography}): HTTP ${res.status}`);
  }

  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
  console.info(`Downloaded ${dest}`);
  return dest;
}

async function normalizeZipTsv(
  gzipPath: string,
  zipAllowList?: Set<string>,
): Promise<RedfinNormalizedBundle> {
  const latestByZip = new Map<string, RedfinZipRecord>();
  let headerMap: Record<string, number> | null = null;
  let rowsScanned = 0;
  let rowsKept = 0;

  const rl = createInterface({
    input: createReadStream(gzipPath).pipe(createGunzip()),
    crlfDelay: true,
  });

  for await (const line of rl) {
    const fields = parseTsvLine(line);
    if (!headerMap) {
      headerMap = Object.fromEntries(fields.map((name, idx) => [name.toUpperCase(), idx]));
      continue;
    }

    rowsScanned++;

    const idx = headerMap;
    const regionType = fields[idx.REGION_TYPE]?.toLowerCase();
    if (regionType !== "zip code") continue;

    const periodDuration = fields[idx.PERIOD_DURATION];
    if (!isMonthlyPeriod(periodDuration)) continue;

    const propertyType = fields[idx.PROPERTY_TYPE];
    if (propertyType !== REDFIN_ALL_RESIDENTIAL_PROPERTY_TYPE) continue;

    const region = fields[idx.REGION] ?? "";
    const zipCode = extractZipCode(region);
    if (!zipCode || !/^\d{5}$/.test(zipCode)) continue;
    if (zipAllowList && !zipAllowList.has(zipCode)) continue;

    const periodEnd = fields[idx.PERIOD_END] ?? "";
    const existing = latestByZip.get(zipCode);
    if (existing && existing.periodEnd >= periodEnd) continue;

    const record: RedfinZipRecord = {
      zipCode,
      region,
      state: fields[idx.STATE_CODE] ?? fields[idx.STATE] ?? "",
      periodBegin: fields[idx.PERIOD_BEGIN] ?? "",
      periodEnd,
      periodDuration: normalizePeriodDuration(periodDuration),
      medianDom: parseNumber(fields[idx.MEDIAN_DOM]),
      medianPpsf: parseNumber(fields[idx.MEDIAN_PPSF]),
      monthsOfSupply: parseNumber(fields[idx.MONTHS_OF_SUPPLY]),
      priceDropsPct: parseNumber(fields[idx.PRICE_DROPS]),
      inventory: parseNumber(fields[idx.INVENTORY]),
      propertyType,
    };

    latestByZip.set(zipCode, record);
    rowsKept++;
  }

  const records = Object.fromEntries(latestByZip.entries());
  const periodEnds = Object.values(records)
    .map((r) => r.periodEnd)
    .filter(Boolean)
    .sort();
  const vintage = periodEnds[periodEnds.length - 1] ?? "unknown";

  console.info(
    `Redfin normalize: scanned ${rowsScanned} rows, kept ${rowsKept} candidate rows, ${Object.keys(records).length} ZIPs`,
  );

  return {
    source: "redfin-market-tracker",
    attribution: REDFIN_ATTRIBUTION,
    downloadedAt: new Date().toISOString(),
    vintage,
    geography: "zip",
    recordCount: Object.keys(records).length,
    records,
  };
}

async function ingestZip(zipAllowList?: Set<string>): Promise<RedfinNormalizedBundle> {
  const gzipPath = await downloadGzip("zip");
  const bundle = await normalizeZipTsv(gzipPath, zipAllowList);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, "zip-latest.json");
  writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.info(`Wrote ${outPath} (${bundle.recordCount} records, vintage ${bundle.vintage})`);
  return bundle;
}

const args = process.argv.slice(2);
const zipsArg = args.find((a) => a.startsWith("--zips="))?.split("=")[1];
const zipAllowList = zipsArg
  ? new Set<string>(zipsArg.split(",").map((z) => z.trim().padStart(5, "0")))
  : new Set<string>(ALL_SANDBOX_ZIPS);

const bundle = await ingestZip(zipAllowList);
console.info(`Redfin ingest complete (${bundle.recordCount} sandbox ZIP records)`);
