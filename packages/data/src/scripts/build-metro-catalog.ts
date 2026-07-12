/**
 * Build nationwide metro catalog (CBSA → ZCTA crosswalk).
 * Run: pnpm --filter @cineborough/data build:metro-catalog
 */
import { writeMetroCatalog } from "../metro-catalog/build-catalog.ts";
import { progressSummary, createEmptyProgress, saveProgress } from "../metro-catalog/progress.ts";

const catalog = writeMetroCatalog();

const msaCount = catalog.metros.filter((m) => m.metroType === "msa").length;
const microCount = catalog.metros.filter((m) => m.metroType === "micro").length;
const withZips = catalog.metros.filter((m) => m.zipCount > 0).length;
const sandbox = catalog.metros.filter((m) => m.isSandbox);

console.info(`Metro catalog written (${catalog.totalMetros} CBSAs)`);
console.info(`  MSAs: ${msaCount}, Micropolitan: ${microCount}`);
console.info(`  With ZCTAs: ${withZips} metros, ${catalog.totalZips} total neighborhoods`);
console.info(`  Sandbox metros: ${sandbox.map((m) => `${m.cbsaCode} (${m.zipCount})`).join(", ")}`);

saveProgress(createEmptyProgress());
console.info(progressSummary());
