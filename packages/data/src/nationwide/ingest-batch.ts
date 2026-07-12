import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../metro-catalog/paths.ts";
import { runMetroShardBuild } from "../run-metro-shard-build.ts";
import type { MetroCatalogEntry } from "../metro-catalog/types.ts";
import { catalogEntryFor, loadMetroCatalog } from "../metro-catalog/build-catalog.ts";
import { markProgress, loadProgress, progressSummary, saveProgress } from "../metro-catalog/progress.ts";
import {
  metroShardPath,
  stagingDirFor,
  ZHVI_ZIP_PATH,
} from "../metro-catalog/paths.ts";
import { isSandboxCbsa, sandboxConfigFor } from "../metro-catalog/sandbox-config.ts";
import {
  fetchMetroBoundaries,
  seedMetroMetrics,
  seedMetroQuotes,
} from "./metro-ingest.ts";
import type { ZhviNormalizedBundle } from "../ingest/zhvi-sources.ts";

export interface IngestMetroOptions {
  /** Skip boundary fetch if staging file exists */
  skipBoundaries?: boolean;
  /** Skip metrics seed if staging file exists */
  skipSeed?: boolean;
  /** Force rebuild even if shard exists */
  force?: boolean;
}

export interface IngestMetroResult {
  cbsaCode: string;
  status: "done" | "skipped" | "failed";
  zipCount: number;
  featureCount: number;
  shardPath: string;
  error?: string;
}

function stagingPaths(cbsaCode: string) {
  const dir = stagingDirFor(cbsaCode);
  return {
    dir,
    boundaries: resolve(dir, "boundaries.geojson"),
    metrics: resolve(dir, "metrics.json"),
    quotes: resolve(dir, "quotes.json"),
  };
}

/** Ingest one CBSA: boundaries → seed metrics → build shard. */
export async function ingestMetro(
  cbsaCode: string,
  options: IngestMetroOptions = {},
): Promise<IngestMetroResult> {
  const metro = catalogEntryFor(cbsaCode);
  if (!metro) {
    return {
      cbsaCode,
      status: "failed",
      zipCount: 0,
      featureCount: 0,
      shardPath: metroShardPath(cbsaCode),
      error: `CBSA ${cbsaCode} not found in catalog`,
    };
  }

  if (metro.zipCount === 0) {
    markProgress(cbsaCode, { status: "skipped", error: "No ZCTAs in catalog" });
    return {
      cbsaCode,
      status: "skipped",
      zipCount: 0,
      featureCount: 0,
      shardPath: metroShardPath(cbsaCode),
      error: "No ZCTAs in catalog",
    };
  }

  const shardPath = metroShardPath(cbsaCode);
  if (!options.force && existsSync(shardPath)) {
    markProgress(cbsaCode, {
      status: "done",
      shardPath,
      completedAt: new Date().toISOString(),
    });
    return {
      cbsaCode,
      status: "done",
      zipCount: metro.zipCount,
      featureCount: metro.zipCount,
      shardPath,
    };
  }

  markProgress(cbsaCode, {
    status: "in_progress",
    startedAt: new Date().toISOString(),
    zipCount: metro.zipCount,
  });

  try {
    // Sandbox metros: use existing mock paths when available
    if (isSandboxCbsa(cbsaCode)) {
      const config = sandboxConfigFor(cbsaCode)!;
      runMetroShardBuild({
        outputPath: shardPath,
        metricsPath: resolve(REPO_ROOT, config.metricsPath),
        boundariesPath: resolve(REPO_ROOT, config.boundariesPath),
        quotesPath: resolve(REPO_ROOT, config.quotesPath),
        cbsaCode,
      });

      markProgress(cbsaCode, {
        status: "done",
        shardPath,
        completedAt: new Date().toISOString(),
        error: undefined,
      });

      return {
        cbsaCode,
        status: "done",
        zipCount: metro.zipCount,
        featureCount: metro.zipCount,
        shardPath,
      };
    }

    const paths = stagingPaths(cbsaCode);
    const zhviZip = JSON.parse(readFileSync(ZHVI_ZIP_PATH, "utf8")) as ZhviNormalizedBundle;

    if (!options.skipBoundaries || !existsSync(paths.boundaries)) {
      const boundaryResult = await fetchMetroBoundaries(metro, paths.boundaries);
      if (boundaryResult.featureCount === 0) {
        throw new Error(
          `No boundaries fetched for ${cbsaCode} (missing: ${boundaryResult.missing.join(", ")})`,
        );
      }
      if (boundaryResult.missing.length > 0) {
        console.warn(
          `[${cbsaCode}] Missing ${boundaryResult.missing.length} ZCTA boundaries: ${boundaryResult.missing.join(", ")}`,
        );
      }
    }

    if (!options.skipSeed || !existsSync(paths.metrics)) {
      seedMetroMetrics(metro, zhviZip, paths.metrics);
      seedMetroQuotes(metro, paths.quotes);
    }

    runMetroShardBuild({
      outputPath: shardPath,
      metricsPath: paths.metrics,
      boundariesPath: paths.boundaries,
      quotesPath: paths.quotes,
      cbsaCode,
    });

    const shard = JSON.parse(readFileSync(shardPath, "utf8")) as { features: unknown[] };

    markProgress(cbsaCode, {
      status: "done",
      shardPath,
      completedAt: new Date().toISOString(),
      error: undefined,
    });

    return {
      cbsaCode,
      status: "done",
      zipCount: metro.zipCount,
      featureCount: shard.features.length,
      shardPath,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    markProgress(cbsaCode, {
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
    });
    return {
      cbsaCode,
      status: "failed",
      zipCount: metro.zipCount,
      featureCount: 0,
      shardPath,
      error: message,
    };
  }
}

export interface IngestBatchOptions extends IngestMetroOptions {
  /** Max metros to process in this batch */
  limit?: number;
  /** Start offset in ingestible metro list */
  offset?: number;
  /** Process only MSAs (LSAD M1) */
  msaOnly?: boolean;
  /** Explicit CBSA codes to process (overrides offset/limit) */
  cbsaCodes?: string[];
}

export interface IngestBatchResult {
  processed: number;
  done: number;
  failed: number;
  skipped: number;
  results: IngestMetroResult[];
  summary: string;
}

export async function ingestBatch(options: IngestBatchOptions = {}): Promise<IngestBatchResult> {
  const catalog = loadMetroCatalog();
  let targets: MetroCatalogEntry[];

  if (options.cbsaCodes?.length) {
    targets = options.cbsaCodes
      .map((code) => catalogEntryFor(code, catalog))
      .filter((m): m is MetroCatalogEntry => m !== undefined && m.zipCount > 0);
  } else {
    targets = catalog.metros.filter((m) => m.zipCount > 0);
    if (options.msaOnly) {
      targets = targets.filter((m) => m.metroType === "msa");
    }
    const offset = options.offset ?? 0;
    const limit = options.limit ?? targets.length;
    targets = targets.slice(offset, offset + limit);
  }

  const results: IngestMetroResult[] = [];

  for (const metro of targets) {
    console.info(`\n=== Ingesting ${metro.cbsaCode} ${metro.name} (${metro.zipCount} ZCTAs) ===`);
    const result = await ingestMetro(metro.cbsaCode, options);
    results.push(result);
    console.info(
      `=== ${metro.cbsaCode}: ${result.status} (${result.featureCount} features) ===`,
    );
  }

  const progress = saveProgress(loadProgress());
  const done = results.filter((r) => r.status === "done").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return {
    processed: results.length,
    done,
    failed,
    skipped,
    results,
    summary: progressSummary(progress),
  };
}
