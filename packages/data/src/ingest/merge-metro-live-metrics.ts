/**
 * Overlay live ZHVI (+ FHFA when available) onto metro-level mock baselines.
 * Used by build-us-metros and build-us-metro-tiles (ADR-012).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeOpportunityScore } from "../opportunity-index.ts";
import {
  computeHomePriceForecast1yr,
  computeOvervaluationPct,
} from "./derived-financials.ts";
import {
  SANDBOX_CBSA_FHFA_MAP,
  SANDBOX_CBSA_ZHVI_METRO_MAP,
  type FhfaHpiNormalizedBundle,
} from "./fhfa-hpi-sources.ts";
import type { ZhviMetroRecord, ZhviNormalizedBundle } from "./zhvi-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INGEST_ROOT = resolve(__dirname, "../../../../data/ingest");

export interface MetroMetricBaseline {
  cbsa: string;
  name: string;
  state: string;
  lng: number;
  lat: number;
  tier?: 1 | 2 | 3;
  medianHomeValue: number;
  homePriceForecast1yr: number;
  overvaluationPct: number;
  capRate: number;
  daysOnMarket: number;
  sellerDesperationScore: number;
  marketPsf: number;
  homeValueGrowthYoy: number;
  remoteWorkPct: number;
  homeowners25to44Pct: number;
  populationGrowthRate: number;
  medianAge: number;
  walkabilityScore: number;
  collegeDegreeRate: number;
}

export interface MergedMetroMetric extends MetroMetricBaseline {
  /** Which fields came from ingest vs mock baseline */
  liveSources: {
    zhvi: boolean;
    fhfa: boolean;
    derivedForecast: boolean;
    derivedOvervaluation: boolean;
  };
}

export interface MergeMetroLiveOptions {
  zhviMetroPath?: string;
  fhfaMetroPath?: string;
}

const DEFAULT_ZHVI_PATH = resolve(INGEST_ROOT, "zhvi/normalized/metro-latest.json");
const DEFAULT_FHFA_PATH = resolve(INGEST_ROOT, "fhfa-hpi/normalized/metro-latest.json");

function loadJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function primaryCity(name: string): string {
  return name.split("-")[0].split(",")[0].trim().toLowerCase();
}

function stateFromCbsaName(name: string): string {
  const parts = name.split(",");
  return parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : "";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Index ZHVI MSAs by primary city + state for CBSA name matching. */
export function buildZhviLookup(
  bundle: ZhviNormalizedBundle | null,
): Map<string, ZhviMetroRecord> {
  const lookup = new Map<string, ZhviMetroRecord>();
  if (!bundle) return lookup;

  for (const rec of Object.values(bundle.records) as ZhviMetroRecord[]) {
    if (rec.regionType !== "msa") continue;
    const city = primaryCity(rec.name);
    const st = rec.state.trim().toUpperCase();
    if (!city || !st) continue;
    lookup.set(`${city}|${st}`, rec);
  }
  return lookup;
}

export function resolveZhviForCbsa(
  cbsa: string,
  cbsaName: string,
  stateHint: string,
  bundle: ZhviNormalizedBundle | null,
  lookup: Map<string, ZhviMetroRecord>,
): ZhviMetroRecord | undefined {
  const mappedId = SANDBOX_CBSA_ZHVI_METRO_MAP[cbsa];
  if (mappedId && bundle?.records[mappedId]) {
    return bundle.records[mappedId] as ZhviMetroRecord;
  }

  const st = (stateHint || stateFromCbsaName(cbsaName)).toUpperCase();
  const city = primaryCity(cbsaName);
  if (!st || !city) return undefined;

  const direct = lookup.get(`${city}|${st}`);
  if (direct) return direct;

  for (const [key, rec] of lookup) {
    if (!key.endsWith(`|${st}`)) continue;
    const zhviCity = key.split("|")[0];
    if (zhviCity.startsWith(city) || city.startsWith(zhviCity)) return rec;
  }
  return undefined;
}

function resolveFhfaForCbsa(
  cbsa: string,
  fhfa: FhfaHpiNormalizedBundle | null,
): FhfaHpiNormalizedBundle["records"][string] | undefined {
  if (!fhfa) return undefined;
  if (fhfa.records[cbsa]) return fhfa.records[cbsa];

  const mapping = SANDBOX_CBSA_FHFA_MAP[cbsa];
  if (mapping) {
    for (const rec of Object.values(fhfa.records)) {
      if (rec.fhfaMetroCode === mapping.fhfaMetroCode) return rec;
    }
  }
  return fhfa.records[cbsa];
}

/**
 * Merge live ZHVI/FHFA onto a mock baseline row. Falls back to baseline when ingest missing.
 */
export function mergeMetroLiveMetrics(
  baseline: MetroMetricBaseline,
  options: MergeMetroLiveOptions & {
    zhviBundle?: ZhviNormalizedBundle | null;
    fhfaBundle?: FhfaHpiNormalizedBundle | null;
    zhviLookup?: Map<string, ZhviMetroRecord>;
    nationalZhvi?: number;
  } = {},
): MergedMetroMetric {
  const zhviBundle =
    options.zhviBundle ??
    loadJsonIfExists<ZhviNormalizedBundle>(options.zhviMetroPath ?? DEFAULT_ZHVI_PATH);
  const fhfaBundle =
    options.fhfaBundle ??
    loadJsonIfExists<FhfaHpiNormalizedBundle>(options.fhfaMetroPath ?? DEFAULT_FHFA_PATH);
  const zhviLookup = options.zhviLookup ?? buildZhviLookup(zhviBundle);

  const nationalRec = zhviBundle?.records["102001"] as ZhviMetroRecord | undefined;
  const nationalZhvi = options.nationalZhvi ?? nationalRec?.zhvi ?? null;

  const merged: MergedMetroMetric = {
    ...baseline,
    liveSources: {
      zhvi: false,
      fhfa: false,
      derivedForecast: false,
      derivedOvervaluation: false,
    },
  };

  const zhviRec = resolveZhviForCbsa(
    baseline.cbsa,
    baseline.name,
    baseline.state,
    zhviBundle,
    zhviLookup,
  );

  if (zhviRec) {
    merged.liveSources.zhvi = true;
    merged.medianHomeValue = Math.round(zhviRec.zhvi);
    if (zhviRec.zhviYoyPct !== null) {
      merged.homeValueGrowthYoy = round1(zhviRec.zhviYoyPct);
    }
  }

  const fhfaRec = resolveFhfaForCbsa(baseline.cbsa, fhfaBundle);
  if (fhfaRec) merged.liveSources.fhfa = true;

  const forecast = computeHomePriceForecast1yr(
    zhviRec?.zhviYoyPct ?? null,
    fhfaRec?.hpiYoyPct ?? null,
    zhviRec?.series,
  );
  if (forecast !== null) {
    merged.homePriceForecast1yr = forecast;
    merged.liveSources.derivedForecast = true;
  }

  if (zhviRec && nationalZhvi && nationalZhvi > 0) {
    const over = computeOvervaluationPct(zhviRec.zhvi, nationalZhvi);
    if (over !== null) {
      merged.overvaluationPct = over;
      merged.liveSources.derivedOvervaluation = true;
    }
  }

  return merged;
}

export function buildBaselineFromBoundary(
  cbsa: string,
  cbsaName: string,
  lng: number,
  lat: number,
  mock?: MetroMetricBaseline,
): MetroMetricBaseline {
  if (mock) return mock;

  const st = stateFromCbsaName(cbsaName);
  const resolvedState = st.length === 2 ? st : "US";
  return {
    cbsa,
    name: cbsaName,
    state: resolvedState,
    lng,
    lat,
    medianHomeValue: 0,
    homePriceForecast1yr: 0,
    overvaluationPct: 0,
    capRate: 5,
    daysOnMarket: 30,
    sellerDesperationScore: 25,
    marketPsf: 200,
    homeValueGrowthYoy: 0,
    remoteWorkPct: 30,
    homeowners25to44Pct: 38,
    populationGrowthRate: 0.5,
    medianAge: 37,
    walkabilityScore: 50,
    collegeDegreeRate: 32,
  };
}

export function computeMetroOpportunityScore(metro: Pick<
  MergedMetroMetric,
  "homePriceForecast1yr" | "overvaluationPct" | "remoteWorkPct"
>): number {
  return computeOpportunityScore({
    homePriceForecast1yr: metro.homePriceForecast1yr,
    overvaluationPct: metro.overvaluationPct,
    remoteWorkPct: metro.remoteWorkPct,
  });
}
