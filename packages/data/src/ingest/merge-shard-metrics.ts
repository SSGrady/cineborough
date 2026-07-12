import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZipMetricsInput } from "../validation.ts";
import type { CensusAcsNormalizedBundle } from "./census-acs.ts";
import { deriveFinancialMetrics } from "./derived-financials.ts";
import { crossCheckRedfinWithZillow, deriveSellerDesperationFromRedfin } from "./derived-market-signals.ts";
import { SANDBOX_CBSA_ZHVI_METRO_MAP, type FhfaHpiNormalizedBundle } from "./fhfa-hpi-sources.ts";
import type { HudFmrNormalizedBundle } from "./hud-fmr-sources.ts";
import type { OsmWalkabilityNormalizedBundle } from "./osm-walkability-sources.ts";
import type { RedfinNormalizedBundle } from "./redfin-sources.ts";
import type { ZillowMarketNormalizedBundle } from "./zillow-market-sources.ts";
import type { ZhviNormalizedBundle, ZhviMetroRecord, ZhviZipRecord } from "./zhvi-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest");

export interface LiveIngestPaths {
  censusAcs: string;
  zhviZip: string;
  zhviMetro: string;
  fhfaHpi: string;
  hudFmr: string;
  redfinZip: string;
  zillowMarketZip: string;
  osmWalkability: string;
}

export const DEFAULT_INGEST_PATHS: LiveIngestPaths = {
  censusAcs: resolve(INGEST_ROOT, "census-acs/normalized/zip-latest.json"),
  zhviZip: resolve(INGEST_ROOT, "zhvi/normalized/zip-latest.json"),
  zhviMetro: resolve(INGEST_ROOT, "zhvi/normalized/metro-latest.json"),
  fhfaHpi: resolve(INGEST_ROOT, "fhfa-hpi/normalized/metro-latest.json"),
  hudFmr: resolve(INGEST_ROOT, "hud/normalized/zip-fmr-latest.json"),
  redfinZip: resolve(INGEST_ROOT, "redfin/normalized/zip-latest.json"),
  zillowMarketZip: resolve(INGEST_ROOT, "zillow-market/normalized/zip-latest.json"),
  osmWalkability: resolve(INGEST_ROOT, "osm-walkability/normalized/zip-latest.json"),
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
  usedHudFmr: boolean;
  usedRedfin: boolean;
  usedZillowMarketCrossCheck: boolean;
  zillowCrossCheckMisaligned: number;
  usedOsmWalkability: boolean;
  usedSellerDesperation: boolean;
  dataAsOf: string;
  dataAsOfLabel: string;
}

function loadJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Cap rate proxy: annual 2BR FMR / ZHVI (ADR-012) */
function computeCapRateFromFmr(fmr2Br: number, zhvi: number): number | null {
  if (fmr2Br <= 0 || zhvi <= 0) return null;
  const annualRent = fmr2Br * 12;
  return Math.round((annualRent / zhvi) * 1000) / 10;
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
  const hudFmr = loadJsonIfExists<HudFmrNormalizedBundle>(paths.hudFmr);
  const redfin = loadJsonIfExists<RedfinNormalizedBundle>(paths.redfinZip);
  const zillowMarket = loadJsonIfExists<ZillowMarketNormalizedBundle>(paths.zillowMarketZip);
  const osmWalkability = loadJsonIfExists<OsmWalkabilityNormalizedBundle>(paths.osmWalkability);

  let usedCensus = false;
  let usedZhvi = false;
  let usedFhfa = false;
  let usedDerivedFinancials = false;
  let usedHudFmr = false;
  let usedRedfin = false;
  let usedZillowMarketCrossCheck = false;
  let zillowCrossCheckMisaligned = 0;
  let usedOsmWalkability = false;
  let usedSellerDesperation = false;

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
      if (demo.incomeGrowthRate !== undefined) {
        merged.incomeGrowthRate = demo.incomeGrowthRate;
      }
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

    const fmrRec = hudFmr?.records[zip.zip];
    const zhviForCap = zhviRec?.zhvi ?? merged.medianHomeValue;
    if (fmrRec && zhviForCap > 0) {
      const capRate = computeCapRateFromFmr(fmrRec.fmr2Br, zhviForCap);
      if (capRate !== null) {
        usedHudFmr = true;
        merged.capRate = capRate;
      }
    } else if (demo?.medianGrossRent && zhviForCap > 0) {
      const capRate = computeCapRateFromFmr(demo.medianGrossRent, zhviForCap);
      if (capRate !== null) {
        merged.capRate = capRate;
      }
    }

    const redfinRec = redfin?.records[zip.zip];
    if (redfinRec) {
      if (redfinRec.medianDom !== null) {
        usedRedfin = true;
        merged.daysOnMarket = Math.round(redfinRec.medianDom);
      }
      if (redfinRec.medianPpsf !== null) {
        usedRedfin = true;
        merged.marketPsf = Math.round(redfinRec.medianPpsf);
      }
      const desperation = deriveSellerDesperationFromRedfin(redfinRec);
      if (desperation) {
        usedRedfin = true;
        usedSellerDesperation = true;
        merged.sellerDesperationScore = desperation.sellerDesperationScore;
        merged.priceCutCount = desperation.priceCutCount;
      }

      const zillowRec = zillowMarket?.records[zip.zip];
      if (zillowRec) {
        usedZillowMarketCrossCheck = true;
        const crossCheck = crossCheckRedfinWithZillow(redfinRec, zillowRec);
        if (!crossCheck.aligned) {
          zillowCrossCheckMisaligned++;
          console.warn(
            `Zillow cross-check misaligned for ${zip.zip}: DOM Δ=${crossCheck.domDeltaDays ?? "n/a"}d, price-cut Δ=${crossCheck.priceCutDeltaPct ?? "n/a"}pp`,
          );
        }
      }
    }

    const walkRec = osmWalkability?.records[zip.zip];
    if (walkRec) {
      usedOsmWalkability = true;
      merged.walkabilityScore = walkRec.walkabilityScore;
    }

    return merged;
  });

  const vintageParts = [
    census ? `ACS ${census.vintage}` : null,
    zhviZip ? `ZHVI ${zhviZip.vintage}` : null,
    fhfa ? `FHFA ${fhfa.vintage}` : null,
    hudFmr && hudFmr.recordCount > 0 ? `HUD FMR ${hudFmr.vintage}` : null,
    redfin && redfin.recordCount > 0 ? `Redfin ${redfin.vintage}` : null,
    zillowMarket && zillowMarket.recordCount > 0
      ? `Zillow market ${zillowMarket.vintage} (cross-check)`
      : null,
    osmWalkability && osmWalkability.recordCount > 0
      ? `OSM walkability ${osmWalkability.vintage}`
      : null,
  ].filter(Boolean);

  const dataAsOf =
    redfin?.vintage ?? fhfa?.vintage ?? census?.vintage ?? zhviZip?.vintage ?? "mock";
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
  if (!usedRedfin) {
    console.warn(
      `Redfin market trends not applied — run ingest:redfin (missing ${paths.redfinZip})`,
    );
  }
  if (usedRedfin && !usedZillowMarketCrossCheck) {
    console.warn(
      `Zillow market cross-check not applied — run ingest:zillow-market (missing ${paths.zillowMarketZip})`,
    );
  }
  if (usedZillowMarketCrossCheck && zillowCrossCheckMisaligned > 0) {
    console.warn(
      `Zillow cross-check: ${zillowCrossCheckMisaligned} ZIP(s) outside tolerance vs Redfin (definitions differ; Redfin remains primary)`,
    );
  }
  if (!usedOsmWalkability) {
    console.warn(
      `OSM walkability not applied — run ingest:osm-walkability (missing ${paths.osmWalkability})`,
    );
  }

  return {
    zips,
    usedCensus,
    usedZhvi,
    usedFhfa,
    usedDerivedFinancials,
    usedHudFmr,
    usedRedfin,
    usedZillowMarketCrossCheck,
    zillowCrossCheckMisaligned,
    usedOsmWalkability,
    usedSellerDesperation,
    dataAsOf,
    dataAsOfLabel,
  };
}
