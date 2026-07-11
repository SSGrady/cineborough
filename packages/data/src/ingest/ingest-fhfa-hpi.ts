/**
 * Downloads and normalizes FHFA House Price Index bulk data (ADR-012 / T033).
 * Run: pnpm --filter @cineborough/data ingest:fhfa-hpi
 */
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { createReadStream } from "node:fs";
import {
  FHFA_ATTRIBUTION,
  FHFA_HPI_CSV_URL,
  SANDBOX_CBSA_FHFA_MAP,
  SANDBOX_CBSAS,
  type FhfaHpiNormalizedBundle,
  type FhfaHpiSeriesPoint,
  type FhfaMetroRecord,
} from "./fhfa-hpi-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/fhfa-hpi");
const RAW_PATH = resolve(INGEST_ROOT, "raw/hpi_exp_metro.txt");
const OUT_PATH = resolve(INGEST_ROOT, "normalized/metro-latest.json");

function parseFhfaLine(line: string): string[] {
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
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pctChange(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const fhfaCodeToCbsa = new Map<string, string>();
for (const cbsa of SANDBOX_CBSAS) {
  const mapping = SANDBOX_CBSA_FHFA_MAP[cbsa];
  if (mapping) fhfaCodeToCbsa.set(mapping.fhfaMetroCode, cbsa);
}

async function downloadFhfaTxt(): Promise<string> {
  mkdirSync(resolve(INGEST_ROOT, "raw"), { recursive: true });

  const res = await fetch(FHFA_HPI_CSV_URL);
  if (!res.ok || !res.body) {
    throw new Error(`FHFA HPI download failed: HTTP ${res.status}`);
  }

  await pipeline(
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    createWriteStream(RAW_PATH),
  );
  console.info(`Downloaded ${RAW_PATH}`);
  return RAW_PATH;
}

interface RawFhfaRow {
  fhfaMetroCode: string;
  name: string;
  year: number;
  quarter: number;
  indexNsa: number;
  indexSa: number;
}

async function parseFhfaTxt(txtPath: string): Promise<Map<string, RawFhfaRow[]>> {
  const rl = createInterface({ input: createReadStream(txtPath, { encoding: "utf8" }), crlfDelay: true });
  const byMetro = new Map<string, RawFhfaRow[]>();
  let isHeader = true;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    const fields = parseFhfaLine(line);
    const fhfaMetroCode = fields[0]?.trim();
    if (!fhfaMetroCode || !fhfaCodeToCbsa.has(fhfaMetroCode)) continue;

    const year = parseNumber(fields[2]);
    const quarter = parseNumber(fields[3]);
    const indexNsa = parseNumber(fields[4]);
    const indexSa = parseNumber(fields[5]);
    if (year === null || quarter === null || indexNsa === null || indexSa === null) continue;

    const row: RawFhfaRow = {
      fhfaMetroCode,
      name: fields[1] ?? fhfaMetroCode,
      year,
      quarter,
      indexNsa,
      indexSa,
    };

    const existing = byMetro.get(fhfaMetroCode) ?? [];
    existing.push(row);
    byMetro.set(fhfaMetroCode, existing);
  }

  return byMetro;
}

function buildMetroRecord(cbsaCode: string, rows: RawFhfaRow[]): FhfaMetroRecord | null {
  if (rows.length === 0) return null;

  rows.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
  const latest = rows[rows.length - 1];
  const mapping = SANDBOX_CBSA_FHFA_MAP[cbsaCode];

  const yoyPrior = rows.find(
    (r) => r.year === latest.year - 1 && r.quarter === latest.quarter,
  );
  const qoqPrior = rows.find((r) => {
    if (latest.quarter > 1) {
      return r.year === latest.year && r.quarter === latest.quarter - 1;
    }
    return r.year === latest.year - 1 && r.quarter === 4;
  });

  const series: FhfaHpiSeriesPoint[] = rows.slice(-8).map((r) => ({
    year: r.year,
    quarter: r.quarter,
    indexNsa: round1(r.indexNsa),
    indexSa: round1(r.indexSa),
  }));

  return {
    cbsaCode,
    fhfaMetroCode: mapping?.fhfaMetroCode ?? latest.fhfaMetroCode,
    name: mapping?.label ?? latest.name,
    indexNsa: round1(latest.indexNsa),
    indexSa: round1(latest.indexSa),
    hpiYoyPct: pctChange(latest.indexNsa, yoyPrior?.indexNsa ?? null) !== null
      ? round1(pctChange(latest.indexNsa, yoyPrior?.indexNsa ?? null)!)
      : null,
    hpiQoqPct: pctChange(latest.indexNsa, qoqPrior?.indexNsa ?? null) !== null
      ? round1(pctChange(latest.indexNsa, qoqPrior?.indexNsa ?? null)!)
      : null,
    series,
  };
}

const txtPath = await downloadFhfaTxt();
const byMetro = await parseFhfaTxt(txtPath);

const records: Record<string, FhfaMetroRecord> = {};
for (const cbsa of SANDBOX_CBSAS) {
  const mapping = SANDBOX_CBSA_FHFA_MAP[cbsa];
  const rows = byMetro.get(mapping.fhfaMetroCode) ?? [];
  const record = buildMetroRecord(cbsa, rows);
  if (record) {
    records[cbsa] = record;
  } else {
    console.warn(`No FHFA rows for CBSA ${cbsa} (FHFA code ${mapping.fhfaMetroCode})`);
  }
}

const latestRecord = Object.values(records)[0];
const vintage = latestRecord
  ? `${latestRecord.series[latestRecord.series.length - 1]?.year ?? "unknown"}Q${latestRecord.series[latestRecord.series.length - 1]?.quarter ?? "?"}`
  : "unknown";

const bundle: FhfaHpiNormalizedBundle = {
  source: "fhfa-hpi-expanded-metro",
  attribution: FHFA_ATTRIBUTION,
  downloadedAt: new Date().toISOString(),
  vintage,
  recordCount: Object.keys(records).length,
  records,
};

mkdirSync(resolve(INGEST_ROOT, "normalized"), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.info(`Wrote ${OUT_PATH} (${bundle.recordCount} metros, vintage ${bundle.vintage})`);
