import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROGRESS_PATH = resolve(process.cwd(), "../../data/catalog/progress.json");

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

export async function GET() {
  if (!existsSync(PROGRESS_PATH)) {
    return NextResponse.json({ cbsaCodes: [], completedMetros: 0, totalMetros: 0 });
  }

  const progress = JSON.parse(readFileSync(PROGRESS_PATH, "utf8")) as ProgressFile;
  const cbsaCodes = Object.values(progress.entries)
    .filter((e) => e.status === "done")
    .map((e) => e.cbsaCode)
    .sort();

  return NextResponse.json(
    {
      cbsaCodes,
      completedMetros: progress.completedMetros,
      totalMetros: progress.totalMetros,
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
