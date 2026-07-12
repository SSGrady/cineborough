import type { MetricLayerKey } from "./types";

export type MetricProvenance = "live" | "derived" | "mock";

export interface MetricProvenanceInfo {
  provenance: MetricProvenance;
  shortLabel: string;
}

/** MVP source labels — see docs/schema/metrics-taxonomy.md */
export const METRIC_PROVENANCE: Record<MetricLayerKey, MetricProvenanceInfo> = {
  opportunityScore: { provenance: "derived", shortLabel: "composite" },
  medianHomeValue: { provenance: "live", shortLabel: "ZHVI" },
  homePriceForecast1yr: { provenance: "derived", shortLabel: "ZHVI+FHFA" },
  overvaluationPct: { provenance: "derived", shortLabel: "ZHVI+ACS" },
  capRate: { provenance: "derived", shortLabel: "ACS rent+ZHVI" },
  daysOnMarket: { provenance: "live", shortLabel: "Redfin" },
  sellerDesperationScore: { provenance: "derived", shortLabel: "Redfin DOM+cuts" },
  marketPsf: { provenance: "live", shortLabel: "Redfin" },
  homeValueGrowthYoy: { provenance: "live", shortLabel: "ZHVI" },
  remoteWorkPct: { provenance: "live", shortLabel: "ACS" },
  homeowners25to44Pct: { provenance: "live", shortLabel: "ACS" },
  populationGrowthRate: { provenance: "live", shortLabel: "ACS" },
  medianAge: { provenance: "live", shortLabel: "ACS" },
  walkabilityScore: { provenance: "live", shortLabel: "OSM" },
  collegeDegreeRate: { provenance: "live", shortLabel: "ACS" },
  incomeGrowthRate: { provenance: "live", shortLabel: "ACS" },
};

export function provenanceBadgeClass(provenance: MetricProvenance): string {
  return `metric-provenance metric-provenance--${provenance}`;
}

/** Bottom-bar attribution line for the active metric layer */
export function metricAttributionLabel(key: MetricLayerKey, dataAsOfLabel: string): string {
  const { provenance, shortLabel } = METRIC_PROVENANCE[key];
  if (provenance === "mock") {
    return `${shortLabel} · mock · ${dataAsOfLabel}`;
  }
  if (provenance === "live") {
    return `${shortLabel} · verified live · ${dataAsOfLabel}`;
  }
  return `${shortLabel} · verified derived · ${dataAsOfLabel}`;
}

/** Tooltip / proof panel source line */
export function metricSourceDetail(key: MetricLayerKey): string {
  const { provenance, shortLabel } = METRIC_PROVENANCE[key];
  const sources: Partial<Record<MetricLayerKey, string>> = {
    medianHomeValue: "data/ingest/zhvi/normalized/metro-latest.json",
    homePriceForecast1yr: "derived-financials.ts (ZHVI 60% + FHFA 40%)",
    overvaluationPct: "derived-financials.ts (ZHVI + ACS income)",
    homeValueGrowthYoy: "data/ingest/zhvi/normalized/metro-latest.json",
    remoteWorkPct: "data/ingest/census-acs/normalized/zip-latest.json",
    homeowners25to44Pct: "data/ingest/census-acs/normalized/zip-latest.json",
    populationGrowthRate: "data/ingest/census-acs/normalized/zip-latest.json",
    incomeGrowthRate: "data/ingest/census-acs/normalized/zip-latest.json",
    medianAge: "data/ingest/census-acs/normalized/zip-latest.json",
    collegeDegreeRate: "data/ingest/census-acs/normalized/zip-latest.json",
    capRate: "derived (ACS rent + ZHVI)",
    daysOnMarket: "data/ingest/redfin/normalized/zip-latest.json",
    sellerDesperationScore:
      "derived-market-signals.ts (Redfin DOM + price_drops; Zillow cross-check optional)",
    marketPsf: "data/ingest/redfin/normalized/zip-latest.json",
    walkabilityScore: "data/ingest/osm-walkability/normalized/zip-latest.json",
    opportunityScore: "composite (forecast + remoteWork − overvaluation)",
  };
  const path = sources[key] ?? shortLabel;
  if (provenance === "mock") return `Source: ${path}`;
  return `Source: ${path} · verified ${provenance}`;
}
