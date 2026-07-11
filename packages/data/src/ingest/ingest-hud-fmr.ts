/**
 * HUD Small Area Fair Market Rent (SAFMR) by ZIP — cap rate proxy (ADR-012).
 * Run: pnpm --filter @cineborough/data ingest:hud-fmr
 */
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ALL_SANDBOX_ZIPS } from "../validation.ts";
import { HUD_FMR_ATTRIBUTION, type HudFmrNormalizedBundle, type HudZipFmrRecord } from "./hud-fmr-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest/hud");
const RAW_PATH = resolve(INGEST_ROOT, "raw/safmr-zip.csv");
const OUT_PATH = resolve(INGEST_ROOT, "normalized/zip-fmr-latest.json");

/** HUD SAFMR ZIP CSV — annual release */
const SAFMR_ZIP_CSV_URL =
  "https://www.huduser.gov/portal/datasets/fmr/fmr2025f/SAFMRsZIPCY2025.csv";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

async function downloadCsv(): Promise<void> {
  mkdirSync(resolve(INGEST_ROOT, "raw"), { recursive: true });
  const res = await fetch(SAFMR_ZIP_CSV_URL);
  if (!res.ok || !res.body) {
    throw new Error(`HUD SAFMR download failed: HTTP ${res.status}`);
  }
  await pipeline(
    Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
    createWriteStream(RAW_PATH),
  );
  console.info(`Downloaded ${RAW_PATH}`);
}

async function normalizeCsv(zipAllowList: Set<string>): Promise<HudFmrNormalizedBundle> {
  const rl = createInterface({ input: createReadStream(RAW_PATH, { encoding: "utf8" }), crlfDelay: true });

  let header: string[] | null = null;
  const records: Record<string, HudZipFmrRecord> = {};

  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      continue;
    }

    const fields = parseCsvLine(line);
    const row = Object.fromEntries(header.map((h, i) => [h, fields[i] ?? ""]));

    const zipCode = (row.zip_code ?? row.ZIP ?? row.Zip_Code ?? "").padStart(5, "0");
    if (!/^\d{5}$/.test(zipCode) || !zipAllowList.has(zipCode)) continue;

    const fmr2Br = Number(row.fmr_2br ?? row.SAFMR_2BR ?? row["2BR"] ?? 0);
    const fmr3Br = Number(row.fmr_3br ?? row.SAFMR_3BR ?? row["3BR"] ?? 0);
    if (!Number.isFinite(fmr2Br) || fmr2Br <= 0) continue;

    records[zipCode] = {
      zipCode,
      fmr2Br: Math.round(fmr2Br),
      fmr3Br: Number.isFinite(fmr3Br) && fmr3Br > 0 ? Math.round(fmr3Br) : Math.round(fmr2Br * 1.2),
    };
  }

  return {
    source: "hud-safmr-zip",
    attribution: HUD_FMR_ATTRIBUTION,
    downloadedAt: new Date().toISOString(),
    vintage: "FY2025",
    recordCount: Object.keys(records).length,
    records,
  };
}

function parseZipArg(): Set<string> {
  const arg = process.argv.find((a) => a.startsWith("--zips="));
  if (!arg) return new Set(ALL_SANDBOX_ZIPS);
  return new Set(
    arg
      .slice("--zips=".length)
      .split(",")
      .map((z) => z.trim().padStart(5, "0")),
  );
}

const zipAllowList = parseZipArg();

await downloadCsv();
const bundle = await normalizeCsv(zipAllowList);

mkdirSync(resolve(INGEST_ROOT, "normalized"), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.info(`Wrote ${OUT_PATH} (${bundle.recordCount} ZCTAs)`);
