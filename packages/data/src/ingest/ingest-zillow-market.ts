/**
 * Downloads and normalizes Zillow Research market metrics bulk CSVs (ADR-012 / T047).
 * Run: pnpm --filter @cineborough/data ingest:zillow-market
 */
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { ALL_SANDBOX_ZIPS } from "../validation.ts";
import { parseCsvLine } from "./csv-parse.ts";
import {
  ZILLOW_MARKET_ATTRIBUTION,
  ZILLOW_MARKET_CSV_URLS,
  type ZillowMarketMetricKey,
  type ZillowMarketNormalizedBundle,
  type ZillowMarketZipRecord,
} from "./zillow-market-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/zillow-market");
const RAW_DIR = resolve(INGEST_ROOT, "raw");
const OUT_DIR = resolve(INGEST_ROOT, "normalized");

const DATE_COL_RE = /^\d{4}-\d{2}-\d{2}$/;

type MetricField = "medianDaysToPending" | "priceCutPct" | "inventory";

const METRIC_FIELD: Record<ZillowMarketMetricKey, MetricField> = {
  medianDaysToPending: "medianDaysToPending",
  priceCutPct: "priceCutPct",
  inventory: "inventory",
};

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Zillow price-cut CSVs use 0–1 fractions; normalize to 0–100 for Redfin cross-check. */
function normalizePriceCutPct(raw: number | null): number | null {
  if (raw === null) return null;
  const pct = raw <= 1 ? raw * 100 : raw;
  return round1(pct);
}

function dateIndices(dateCols: string[]): { latest: number; metaCount: number } {
  const latestIdx = dateCols.length - 1;
  return { latest: latestIdx, metaCount: 0 };
}

async function downloadCsv(metric: ZillowMarketMetricKey): Promise<string> {
  const url = ZILLOW_MARKET_CSV_URLS[metric];
  const dest = resolve(RAW_DIR, `${metric}.csv`);

  mkdirSync(RAW_DIR, { recursive: true });

  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Zillow market download failed (${metric}): HTTP ${res.status}`);
  }

  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
  console.info(`Downloaded ${dest}`);
  return dest;
}

async function normalizeMetricCsv(
  csvPath: string,
  metric: ZillowMarketMetricKey,
  zipAllowList?: Set<string>,
): Promise<{ vintage: string; records: Map<string, Partial<ZillowMarketZipRecord>> }> {
  const rl = createInterface({ input: createReadStream(csvPath, { encoding: "utf8" }), crlfDelay: true });

  let dateCols: string[] = [];
  let metaCount = 0;
  let latestIdx = -1;
  const records = new Map<string, Partial<ZillowMarketZipRecord>>();
  const field = METRIC_FIELD[metric];

  for await (const line of rl) {
    const fields = parseCsvLine(line);
    if (latestIdx < 0) {
      dateCols = fields.filter((h) => DATE_COL_RE.test(h));
      metaCount = fields.length - dateCols.length;
      latestIdx = metaCount + dateIndices(dateCols).latest;
      continue;
    }

    if (fields[3] !== "zip") continue;

    const zipCode = fields[2]?.padStart(5, "0");
    if (!/^\d{5}$/.test(zipCode)) continue;
    if (zipAllowList && !zipAllowList.has(zipCode)) continue;

    let value = parseNumber(fields[latestIdx]);
    if (field === "priceCutPct") {
      value = normalizePriceCutPct(value);
    } else if (value !== null) {
      value = round1(value);
    }

    const existing = records.get(zipCode) ?? {
      zipCode,
      regionId: fields[0],
      state: fields[5] ?? "",
      city: fields[6] ?? "",
      metro: fields[7] ?? "",
      county: fields[8] ?? "",
      medianDaysToPending: null,
      priceCutPct: null,
      inventory: null,
    };

    existing[field] = value;
    records.set(zipCode, existing);
  }

  const vintage = dateCols[dateCols.length - 1] ?? "unknown";
  return { vintage, records };
}

async function ingestZip(zipAllowList?: Set<string>): Promise<ZillowMarketNormalizedBundle> {
  const merged = new Map<string, ZillowMarketZipRecord>();
  let vintage = "";

  for (const metric of Object.keys(ZILLOW_MARKET_CSV_URLS) as ZillowMarketMetricKey[]) {
    const csvPath = await downloadCsv(metric);
    const { vintage: metricVintage, records } = await normalizeMetricCsv(csvPath, metric, zipAllowList);
    if (metricVintage && metricVintage > vintage) vintage = metricVintage;

    for (const [zipCode, partial] of records) {
      const existing = merged.get(zipCode) ?? {
        zipCode,
        regionId: partial.regionId ?? "",
        state: partial.state ?? "",
        city: partial.city ?? "",
        metro: partial.metro ?? "",
        county: partial.county ?? "",
        medianDaysToPending: null,
        priceCutPct: null,
        inventory: null,
      };

      existing.medianDaysToPending = partial.medianDaysToPending ?? existing.medianDaysToPending;
      existing.priceCutPct = partial.priceCutPct ?? existing.priceCutPct;
      existing.inventory = partial.inventory ?? existing.inventory;
      merged.set(zipCode, existing);
    }
  }

  const bundle: ZillowMarketNormalizedBundle = {
    source: "zillow-research-market",
    attribution: ZILLOW_MARKET_ATTRIBUTION,
    downloadedAt: new Date().toISOString(),
    vintage: vintage || "unknown",
    geography: "zip",
    recordCount: merged.size,
    records: Object.fromEntries(merged.entries()),
  };

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
console.info(`Zillow market ingest complete (${bundle.recordCount} sandbox ZIP records)`);
