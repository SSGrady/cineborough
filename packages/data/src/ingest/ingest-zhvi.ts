/**
 * Downloads and normalizes Zillow Research ZHVI bulk CSVs (ADR-012 / T033).
 * Run: pnpm --filter @cineborough/data ingest:zhvi
 */
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { ZHVI_ATTRIBUTION, ZHVI_CSV_URLS, type ZhviGeography } from "./zhvi-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/zhvi");
const RAW_DIR = resolve(INGEST_ROOT, "raw");
const OUT_DIR = resolve(INGEST_ROOT, "normalized");

const DATE_COL_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ZhviSeriesPoint {
  date: string;
  zhvi: number;
}

export interface ZhviZipRecord {
  zipCode: string;
  regionId: string;
  state: string;
  city: string;
  metro: string;
  county: string;
  zhvi: number;
  zhviMomPct: number | null;
  zhviYoyPct: number | null;
  series: ZhviSeriesPoint[];
}

export interface ZhviMetroRecord {
  regionId: string;
  name: string;
  state: string;
  regionType: string;
  zhvi: number;
  zhviMomPct: number | null;
  zhviYoyPct: number | null;
  series: ZhviSeriesPoint[];
}

export interface ZhviNormalizedBundle {
  source: "zillow-research-zhvi";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  geography: ZhviGeography;
  recordCount: number;
  records: Record<string, ZhviZipRecord | ZhviMetroRecord>;
}

/** Parse one CSV line respecting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function pctChange(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickSeries(
  fields: string[],
  dateCols: string[],
  metaCount: number,
  indices: { latest: number; mom: number | null; yoy: number | null },
): { zhvi: number; mom: number | null; yoy: number | null; series: ZhviSeriesPoint[] } | null {
  const latestVal = parseNumber(fields[indices.latest]);
  if (latestVal === null) return null;

  const momVal = indices.mom !== null ? parseNumber(fields[indices.mom]) : null;
  const yoyVal = indices.yoy !== null ? parseNumber(fields[indices.yoy]) : null;

  const series: ZhviSeriesPoint[] = [];
  const start = Math.max(0, dateCols.length - 6);
  for (let i = start; i < dateCols.length; i++) {
    const v = parseNumber(fields[metaCount + i]);
    if (v !== null) series.push({ date: dateCols[i], zhvi: Math.round(v) });
  }

  return {
    zhvi: Math.round(latestVal),
    mom: pctChange(latestVal, momVal),
    yoy: pctChange(latestVal, yoyVal),
    series,
  };
}

function dateIndices(dateCols: string[]): { latest: number; mom: number | null; yoy: number | null; metaCount: number } {
  const latestIdx = dateCols.length - 1;
  const latestDate = dateCols[latestIdx];
  const momIdx = latestIdx > 0 ? latestIdx - 1 : null;

  const [y, m] = latestDate.split("-").map(Number);
  const yoyKey = `${y - 1}-${String(m).padStart(2, "0")}-${latestDate.split("-")[2]}`;
  const yoyIdx = dateCols.indexOf(yoyKey);

  return {
    latest: latestIdx,
    mom: momIdx,
    yoy: yoyIdx >= 0 ? yoyIdx : null,
    metaCount: 0,
  };
}

async function downloadCsv(geography: ZhviGeography): Promise<string> {
  const url = ZHVI_CSV_URLS[geography];
  const dest = resolve(RAW_DIR, `${geography}_zhvi.csv`);

  mkdirSync(RAW_DIR, { recursive: true });

  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`ZHVI download failed (${geography}): HTTP ${res.status}`);
  }

  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
  console.info(`Downloaded ${dest}`);
  return dest;
}

async function normalizeMetroCsv(csvPath: string): Promise<ZhviNormalizedBundle> {
  const rl = createInterface({ input: createReadStream(csvPath, { encoding: "utf8" }), crlfDelay: true });

  let header: string[] | null = null;
  let dateCols: string[] = [];
  let metaCount = 0;
  let indices: ReturnType<typeof dateIndices> | null = null;
  const records: Record<string, ZhviMetroRecord> = {};

  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      dateCols = header.filter((h) => DATE_COL_RE.test(h));
      metaCount = header.length - dateCols.length;
      const rel = dateIndices(dateCols);
      indices = {
        ...rel,
        latest: metaCount + rel.latest,
        mom: rel.mom !== null ? metaCount + rel.mom : null,
        yoy: rel.yoy !== null ? metaCount + rel.yoy : null,
        metaCount,
      };
      continue;
    }

    if (!indices) continue;
    const fields = parseCsvLine(line);
    const parsed = pickSeries(fields, dateCols, metaCount, indices);
    if (!parsed) continue;

    const regionId = fields[0];
    const name = fields[2];
    const regionType = fields[3];
    if (regionType !== "msa" && regionType !== "country") continue;

    records[regionId] = {
      regionId,
      name,
      state: fields[4] ?? "",
      regionType,
      zhvi: parsed.zhvi,
      zhviMomPct: parsed.mom,
      zhviYoyPct: parsed.yoy,
      series: parsed.series,
    };
  }

  const vintage = dateCols[dateCols.length - 1] ?? "unknown";
  return {
    source: "zillow-research-zhvi",
    attribution: ZHVI_ATTRIBUTION,
    downloadedAt: new Date().toISOString(),
    vintage,
    geography: "metro",
    recordCount: Object.keys(records).length,
    records,
  };
}

async function normalizeZipCsv(csvPath: string): Promise<ZhviNormalizedBundle> {
  const rl = createInterface({ input: createReadStream(csvPath, { encoding: "utf8" }), crlfDelay: true });

  let header: string[] | null = null;
  let dateCols: string[] = [];
  let metaCount = 0;
  let indices: ReturnType<typeof dateIndices> | null = null;
  const records: Record<string, ZhviZipRecord> = {};

  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      dateCols = header.filter((h) => DATE_COL_RE.test(h));
      metaCount = header.length - dateCols.length;
      const rel = dateIndices(dateCols);
      indices = {
        ...rel,
        latest: metaCount + rel.latest,
        mom: rel.mom !== null ? metaCount + rel.mom : null,
        yoy: rel.yoy !== null ? metaCount + rel.yoy : null,
        metaCount,
      };
      continue;
    }

    if (!indices) continue;
    const fields = parseCsvLine(line);
    if (fields[3] !== "zip") continue;

    const parsed = pickSeries(fields, dateCols, metaCount, indices);
    if (!parsed) continue;

    const zipCode = fields[2]?.padStart(5, "0");
    if (!/^\d{5}$/.test(zipCode)) continue;

    records[zipCode] = {
      zipCode,
      regionId: fields[0],
      state: fields[5] ?? "",
      city: fields[6] ?? "",
      metro: fields[7] ?? "",
      county: fields[8] ?? "",
      zhvi: parsed.zhvi,
      zhviMomPct: parsed.mom,
      zhviYoyPct: parsed.yoy,
      series: parsed.series,
    };
  }

  const vintage = dateCols[dateCols.length - 1] ?? "unknown";
  return {
    source: "zillow-research-zhvi",
    attribution: ZHVI_ATTRIBUTION,
    downloadedAt: new Date().toISOString(),
    vintage,
    geography: "zip",
    recordCount: Object.keys(records).length,
    records,
  };
}

async function ingestGeography(geography: ZhviGeography): Promise<ZhviNormalizedBundle> {
  const csvPath = await downloadCsv(geography);
  const bundle =
    geography === "zip" ? await normalizeZipCsv(csvPath) : await normalizeMetroCsv(csvPath);

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, `${geography}-latest.json`);
  writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.info(`Wrote ${outPath} (${bundle.recordCount} records, vintage ${bundle.vintage})`);
  return bundle;
}

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1] as ZhviGeography | undefined;
const geographies: ZhviGeography[] = only ? [only] : ["metro", "zip"];

let total = 0;
for (const g of geographies) {
  const bundle = await ingestGeography(g);
  total += bundle.recordCount;
}

console.info(`ZHVI ingest complete (${total} total records across ${geographies.join(", ")})`);
