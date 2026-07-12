import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IngestProgress, IngestProgressEntry } from "./types.ts";
import { CATALOG_DIR, PROGRESS_PATH } from "./paths.ts";
import { loadMetroCatalog } from "./build-catalog.ts";

export function createEmptyProgress(): IngestProgress {
  const catalog = loadMetroCatalog();
  const entries: Record<string, IngestProgressEntry> = {};

  for (const metro of catalog.metros) {
    entries[metro.cbsaCode] = {
      cbsaCode: metro.cbsaCode,
      status: metro.zipCount === 0 ? "skipped" : "pending",
      zipCount: metro.zipCount,
    };
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalMetros: catalog.metros.filter((m) => m.zipCount > 0).length,
    completedMetros: 0,
    failedMetros: 0,
    totalNeighborhoods: 0,
    entries,
  };
}

export function loadProgress(): IngestProgress {
  if (!existsSync(PROGRESS_PATH)) {
    return saveProgress(createEmptyProgress());
  }
  return JSON.parse(readFileSync(PROGRESS_PATH, "utf8")) as IngestProgress;
}

export function saveProgress(progress: IngestProgress): IngestProgress {
  mkdirSync(CATALOG_DIR, { recursive: true });

  const entries = Object.values(progress.entries);
  progress.completedMetros = entries.filter((e) => e.status === "done").length;
  progress.failedMetros = entries.filter((e) => e.status === "failed").length;
  progress.totalNeighborhoods = entries
    .filter((e) => e.status === "done")
    .reduce((sum, e) => sum + e.zipCount, 0);
  progress.updatedAt = new Date().toISOString();

  writeFileSync(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
  return progress;
}

export function markProgress(
  cbsaCode: string,
  patch: Partial<IngestProgressEntry>,
): IngestProgress {
  const progress = loadProgress();
  const existing = progress.entries[cbsaCode];
  if (!existing) {
    throw new Error(`Unknown CBSA in progress tracker: ${cbsaCode}`);
  }
  progress.entries[cbsaCode] = { ...existing, ...patch, cbsaCode };
  return saveProgress(progress);
}

export function progressSummary(progress?: IngestProgress): string {
  const p = progress ?? loadProgress();
  const pending = Object.values(p.entries).filter((e) => e.status === "pending").length;
  const inProgress = Object.values(p.entries).filter((e) => e.status === "in_progress").length;
  const skipped = Object.values(p.entries).filter((e) => e.status === "skipped").length;

  return [
    `Nationwide ingest: ${p.completedMetros}/${p.totalMetros} metros done`,
    `(${p.totalNeighborhoods} neighborhoods, ${p.failedMetros} failed, ${pending} pending, ${inProgress} in progress, ${skipped} skipped)`,
  ].join(" ");
}
