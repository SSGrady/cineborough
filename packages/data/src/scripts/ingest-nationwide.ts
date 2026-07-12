/**
 * Nationwide batch metro ingest with checkpointing.
 * Run: pnpm --filter @cineborough/data ingest:nationwide -- --limit=10 --offset=0
 *
 * Options:
 *   --limit=N       Max metros per batch (default: all pending)
 *   --offset=N      Start offset in ingestible metro list
 *   --msa-only      Process only MSAs (LSAD M1)
 *   --cbsa=CODE     Process single CBSA (repeatable)
 *   --force         Rebuild shards even if they exist
 *   --skip-boundaries  Reuse staging boundaries
 *   --skip-seed        Reuse staging metrics
 */
import { ingestBatch } from "../nationwide/ingest-batch.ts";
import { writeMetroCatalog } from "../metro-catalog/build-catalog.ts";

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const offsetArg = args.find((a) => a.startsWith("--offset="));
  const cbsaArgs = args.filter((a) => a.startsWith("--cbsa=")).map((a) => a.slice("--cbsa=".length));

  return {
    limit: limitArg ? Number(limitArg.slice("--limit=".length)) : undefined,
    offset: offsetArg ? Number(offsetArg.slice("--offset=".length)) : 0,
    msaOnly: args.includes("--msa-only"),
    force: args.includes("--force"),
    skipBoundaries: args.includes("--skip-boundaries"),
    skipSeed: args.includes("--skip-seed"),
    cbsaCodes: cbsaArgs.length > 0 ? cbsaArgs : undefined,
    rebuildCatalog: args.includes("--rebuild-catalog"),
  };
}

const opts = parseArgs();

if (opts.rebuildCatalog) {
  writeMetroCatalog();
  console.info("Rebuilt metro catalog");
}

const result = await ingestBatch({
  limit: opts.limit,
  offset: opts.offset,
  msaOnly: opts.msaOnly,
  cbsaCodes: opts.cbsaCodes,
  force: opts.force,
  skipBoundaries: opts.skipBoundaries,
  skipSeed: opts.skipSeed,
});

console.info(`\nBatch complete: ${result.done} done, ${result.failed} failed, ${result.skipped} skipped`);
console.info(result.summary);

if (result.failed > 0) {
  for (const r of result.results.filter((x) => x.status === "failed")) {
    console.error(`  FAILED ${r.cbsaCode}: ${r.error}`);
  }
  process.exitCode = 1;
}
