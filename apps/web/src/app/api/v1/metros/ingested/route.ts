import { NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const PROGRESS_PATH = resolve(process.cwd(), "../../data/catalog/progress.json");
const METROS_DIR = resolve(process.cwd(), "../../data/metros");
const BUNDLED_SANDBOX_CBSAS = new Set(["47900", "36740", "41860", "41940"]);

interface ProgressEntry {
  cbsaCode: string;
  status: string;
  zipCount?: number;
}

interface ProgressFile {
  completedMetros: number;
  totalMetros: number;
  entries: Record<string, ProgressEntry>;
}

function cbsasWithShardOnDisk(): string[] {
  if (!existsSync(METROS_DIR)) return [];
  return readdirSync(METROS_DIR)
    .filter((name) => /^\d{5}\.geojson$/.test(name))
    .map((name) => name.replace(/\.geojson$/, ""));
}

export async function GET() {
  const onDisk = new Set(cbsasWithShardOnDisk());
  for (const cbsa of BUNDLED_SANDBOX_CBSAS) onDisk.add(cbsa);

  if (!existsSync(PROGRESS_PATH)) {
    const cbsaCodes = [...onDisk].sort();
    return NextResponse.json({ cbsaCodes, completedMetros: cbsaCodes.length, totalMetros: 0 });
  }

  const progress = JSON.parse(readFileSync(PROGRESS_PATH, "utf8")) as ProgressFile;
  const fromProgress = Object.values(progress.entries)
    .filter((e) => e.status === "done")
    .map((e) => e.cbsaCode);

  const cbsaCodes = [...new Set([...fromProgress, ...onDisk])].sort();

  return NextResponse.json(
    {
      cbsaCodes,
      completedMetros: progress.completedMetros,
      totalMetros: progress.totalMetros,
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
