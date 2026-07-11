import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZipMetricsInput } from "../validation.ts";
import type { CensusAcsNormalizedBundle } from "./census-acs.ts";
import { deriveFinancialMetrics } from "./derived-financials.ts";
import { SANDBOX_CBSA_ZHVI_METRO_MAP, type FhfaHpiNormalizedBundle } from "./fhfa-hpi-sources.ts";
import type { ZhviNormalizedBundle, ZhviMetroRecord, ZhviZipRecord } from "./zhvi-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest");

export interface LiveIngestPaths {
  censusAcs: string;
  zhviZip: string;
  zhviMetro: string;
  fhfaHpi: string;
}

export const DEFAULT_INGEST_PATHS: LiveIngestPaths = {
  censusAcs: resolve(INGEST_ROOT, "census-acs/normalized/zip-latest.json"),
  zhviZip: resolve(INGEST_ROOT, "zhvi/normalized/zip-latest.json"),
  zhviMetro: resolve(INGEST_ROOT, "zhvi/normalized/metro-latest.json"),
  fhfaHpi: resolve(INGEST_ROOT, "fhfa-hpi/normalized/metro-latest.json"),
};

export interface MergeLiveMetricsOptions {
  paths?: LiveIngestPaths;
  cbsaCode?: string;
}

export interface MergeLiveMetricsResult {
  zips: ZipMetricsInput[];
  usedCensus: boolean;
  usedZhvi: boolean;
  usedFhfa: boolean;
  usedDerivedFinancials: boolean;
  dataAsOf: string;
  dataAsOfLabel: string;
}

function loadJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function medianIncomeFromZips(
  zips: ZipMetricsInput[],
  census: CensusAcsNormalizedBundle | null,
): number | null {
  const incomes: number[] = [];
  for (const zip of zips) {
    const income = census?.records[zip.zip]?.medianHouseholdIncome;
    if (income !== undefined && income > 0) incomes.push(income);
  }
  if (incomes.length === 0) return null;
  incomes.sort((a, b) => a - b);
  const mid = Math.floor(incomes.length / 2);
  return incomes.length % 2 === 0
    ? Math.round((incomes[mid - 1] + incomes[mid]) / 2)
    : incomes[mid];
}

/**
 * Overlays live Census hope-core + ZHVI home values + derived forecast/overvaluation
 * onto base shard metrics. Falls back to base fields when ingest files are missing.
 */
export function mergeLiveMetricsIntoZips(
  baseZips: ZipMetricsInput[],
  options: MergeLiveMetricsOptions = {},
): MergeLiveMetricsResult {
  const paths = options.paths ?? DEFAULT_INGEST_PATHS;
  const cbsaCode = options.cbsaCode;

  const census = loadJsonIfExists<CensusAcsNormalizedBundle>(paths.censusAcs);
  const zhviZip = loadJsonIfExists<ZhviNormalizedBundle>(paths.zhviZip);
  const zhviMetro = loadJsonIfExists<ZhviNormalizedBundle>(paths.zhviMetro);
  const fhfa = loadJsonIfExists<FhfaHpiNormalizedBundle>(paths.fhfaHpi);

  let usedCensus = false;
  let usedZhvi = false;
  let usedFhfa = false;
  let usedDerivedFinancials = false;

  const fhfaMetro = cbsaCode ? fhfa?.records[cbsaCode] : undefined;
  const zhviMetroRegionId = cbsaCode ? SANDBOX_CBSA_ZHVI_METRO_MAP[cbsaCode] : undefined;
  const zhviMetroRecord = zhviMetroRegionId
    ? (zhviMetro?.records[zhviMetroRegionId] as ZhviMetroRecord | undefined)
    : undefined;

  const metroMedianIncome = medianIncomeFromZips(baseZips, census);

  const zips = baseZips.map((zip) => {
    const merged = { ...zip };
    const demo = census?.records[zip.zip];
    if (demo) {
      usedCensus = true;
      merged.remoteWorkPct = demo.remoteWorkPct;
      merged.homeowners25to44Pct = demo.homeowners25to44Pct;
      merged.populationGrowthRate = demo.populationGrowthRate;
      merged.medianAge = demo.medianAge;
      merged.collegeDegreeRate = demo.collegeDegreeRate;
    }

    const zhviRec = zhviZip?.records[zip.zip] as ZhviZipRecord | undefined;
    if (zhviRec) {
      usedZhvi = true;
      merged.medianHomeValue = zhviRec.zhvi;
      if (zhviRec.zhviYoyPct !== null) {
        merged.homeValueGrowthYoy = Math.round(zhviRec.zhviYoyPct * 10) / 10;
      }
    }

    if (zhviRec && fhfaMetro) {
      usedFhfa = true;
      const derived = deriveFinancialMetrics({
        zhvi: zhviRec,
        fhfaMetro,
        zhviMetro: zhviMetroRecord,
        medianHouseholdIncome: demo?.medianHouseholdIncome,
        metroMedianHouseholdIncome: metroMedianIncome,
      });
      if (derived) {
        usedDerivedFinancials = true;
        merged.homePriceForecast1yr = derived.homePriceForecast1yr;
        merged.overvaluationPct = derived.overvaluationPct;
      }
    }

    return merged;
  });

  const vintageParts = [
    census ? `ACS ${census.vintage}` : null,
    zhviZip ? `ZHVI ${zhviZip.vintage}` : null,
    fhfa ? `FHFA ${fhfa.vintage}` : null,
  ].filter(Boolean);

  const dataAsOf = fhfa?.vintage ?? census?.vintage ?? zhviZip?.vintage ?? "mock";
  const dataAsOfLabel =
    vintageParts.length > 0 ? vintageParts.join(" + ") : "May 2026";

  if (!usedCensus) {
    console.warn(
      `Census demographics not applied — run ingest:census-acs (missing ${paths.censusAcs})`,
    );
  }
  if (!usedZhvi) {
    console.warn(
      `ZHVI home values not applied — run ingest:zhvi --only=zip (missing ${paths.zhviZip})`,
    );
  }
  if (cbsaCode && !usedFhfa) {
    console.warn(
      `FHFA HPI not applied — run ingest:fhfa-hpi (missing ${paths.fhfaHpi})`,
    );
  }
  if (cbsaCode && usedZhvi && usedFhfa && !usedDerivedFinancials) {
    console.warn(`Derived forecast/overvaluation not applied for CBSA ${cbsaCode}`);
  }

  return {
    zips,
    usedCensus,
    usedZhvi,
    usedFhfa,
    usedDerivedFinancials,
    dataAsOf,
    dataAsOfLabel,
  };
}
