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
  daysOnMarket: { provenance: "mock", shortLabel: "mock estimate" },
  sellerDesperationScore: { provenance: "mock", shortLabel: "mock estimate" },
  marketPsf: { provenance: "mock", shortLabel: "mock estimate" },
  homeValueGrowthYoy: { provenance: "live", shortLabel: "ZHVI" },
  remoteWorkPct: { provenance: "live", shortLabel: "ACS" },
  homeowners25to44Pct: { provenance: "live", shortLabel: "ACS" },
  populationGrowthRate: { provenance: "live", shortLabel: "ACS" },
  medianAge: { provenance: "live", shortLabel: "ACS" },
  walkabilityScore: { provenance: "mock", shortLabel: "mock estimate" },
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
    return `${shortLabel} · ${dataAsOfLabel}`;
  }
  return `${shortLabel} · ${dataAsOfLabel}`;
}
