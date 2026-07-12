/**
 * Print nationwide ingest progress summary.
 * Run: pnpm --filter @cineborough/data ingest:status
 */
import { loadMetroCatalog } from "../metro-catalog/build-catalog.ts";
import { loadProgress, progressSummary } from "../metro-catalog/progress.ts";

const catalog = loadMetroCatalog();
const progress = loadProgress();

const msaWithZips = catalog.metros.filter((m) => m.metroType === "msa" && m.zipCount > 0);
const microWithZips = catalog.metros.filter((m) => m.metroType === "micro" && m.zipCount > 0);

console.info("=== Nationwide Metro Ingest Status ===");
console.info(progressSummary(progress));
console.info(`Catalog: ${catalog.totalMetros} CBSAs, ${catalog.totalZips} neighborhoods`);
console.info(`  MSAs with ZCTAs: ${msaWithZips.length} (${msaWithZips.reduce((s, m) => s + m.zipCount, 0)} ZCTAs)`);
console.info(`  Micro areas with ZCTAs: ${microWithZips.length}`);
console.info(`  Sandbox: ${catalog.metros.filter((m) => m.isSandbox).map((m) => m.cbsaCode).join(", ")}`);

const failed = Object.values(progress.entries).filter((e) => e.status === "failed");
if (failed.length > 0) {
  console.info(`\nFailed metros (${failed.length}):`);
  for (const f of failed.slice(0, 20)) {
    console.info(`  ${f.cbsaCode}: ${f.error}`);
  }
  if (failed.length > 20) {
    console.info(`  ... and ${failed.length - 20} more`);
  }
}
