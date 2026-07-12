/**
 * Build a single metro shard from staging or sandbox paths.
 * Run: pnpm --filter @cineborough/data build:metro-shard -- --cbsa=33100
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMetroShardBuild } from "../run-metro-shard-build.ts";
import { catalogEntryFor } from "../metro-catalog/build-catalog.ts";
import { metroShardPath, stagingDirFor } from "../metro-catalog/paths.ts";
import { isSandboxCbsa, sandboxConfigFor } from "../metro-catalog/sandbox-config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

const cbsaArg = process.argv.find((a) => a.startsWith("--cbsa="));
if (!cbsaArg) {
  throw new Error("Usage: build:metro-shard -- --cbsa=33100");
}

const cbsaCode = cbsaArg.slice("--cbsa=".length).padStart(5, "0");
const metro = catalogEntryFor(cbsaCode);
if (!metro) {
  throw new Error(`CBSA ${cbsaCode} not found in catalog — run build:metro-catalog first`);
}

if (isSandboxCbsa(cbsaCode)) {
  const config = sandboxConfigFor(cbsaCode)!;
  runMetroShardBuild({
    outputPath: resolve(REPO_ROOT, config.outputPath),
    metricsPath: resolve(REPO_ROOT, config.metricsPath),
    boundariesPath: resolve(REPO_ROOT, config.boundariesPath),
    quotesPath: resolve(REPO_ROOT, config.quotesPath),
    cbsaCode,
  });
} else {
  const staging = stagingDirFor(cbsaCode);
  runMetroShardBuild({
    outputPath: metroShardPath(cbsaCode),
    metricsPath: resolve(staging, "metrics.json"),
    boundariesPath: resolve(staging, "boundaries.geojson"),
    quotesPath: resolve(staging, "quotes.json"),
    cbsaCode,
  });
}

console.info(`Built shard for ${cbsaCode} (${metro.name})`);
