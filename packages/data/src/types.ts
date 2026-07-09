/**
 * Canonical metric types for Cineborough.
 * Keep in sync with docs/schema/metrics-taxonomy.md and docs/schema/opportunity-index.md
 */

export interface InvestorMetrics {
  homePriceForecast1yr: number;
  overvaluationPct: number;
  capRate: number;
  daysOnMarket: number;
  sellerDesperationScore: number;
  marketPsf: number;
  homeValueGrowthYoy: number;
  medianHomeValue: number;
  priceCutCount?: number;
}

export interface HopeCoreMetrics {
  remoteWorkPct: number;
  homeowners25to44Pct: number;
  populationGrowthRate: number;
  medianAge: number;
  walkabilityScore: number;
  collegeDegreeRate: number;
}

export interface ZipMetrics extends InvestorMetrics, HopeCoreMetrics {
  zip: string;
  name: string;
  state: string;
  /** Precomputed raw opportunity score (forecast + remoteWork - overvaluation) */
  opportunityScore: number;
  /** Normalized 0–100 for choropleth */
  opportunityScoreNormalized?: number;
}

export interface ZipMetricsCollection {
  metro: string;
  updatedAt: string;
  zips: ZipMetrics[];
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

/** Unified Deck.gl feature properties — see docs/schema/deck-gl-geojson.md */
export interface DcMetroFeatureProperties {
  zipCode: string;
  neighborhoodName: string;
  state: string;
  medianHomeValue: number;
  oneYearForecastPct: number;
  overvaluationPct: number;
  capRatePct: number;
  daysOnMarket: number;
  sellerDesperationScore: number;
  marketPsf: number;
  homeValueGrowthYoy: number;
  priceCutCount: number;
  remoteWorkPct: number;
  homeowners25to44Pct: number;
  populationGrowthRate: number;
  medianAge: number;
  walkScore: number;
  collegeDegreeRate: number;
  localQuote: string;
  primaryVibe: string;
  opportunityScore: number;
  opportunityScoreNormalized: number;
  fillColor: string;
  fillColorRgb: [number, number, number];
  labelLng: number;
  labelLat: number;
}

export interface DcMetroFeature {
  type: "Feature";
  properties: DcMetroFeatureProperties;
  geometry: PolygonGeometry;
}

export interface DcMetroGeoJsonMetadata {
  metro: string;
  dataAsOf: string;
  dataAsOfLabel: string;
  sandboxZips: string[];
  generatedAt: string;
}

export interface DcMetroGeoJson {
  type: "FeatureCollection";
  metadata: DcMetroGeoJsonMetadata;
  features: DcMetroFeature[];
}

export type MetricLayerKey =
  | "opportunityScore"
  | "homePriceForecast1yr"
  | "overvaluationPct"
  | "capRate"
  | "daysOnMarket"
  | "sellerDesperationScore"
  | "marketPsf"
  | "homeValueGrowthYoy"
  | "medianHomeValue"
  | "remoteWorkPct"
  | "homeowners25to44Pct"
  | "populationGrowthRate"
  | "medianAge"
  | "walkabilityScore"
  | "collegeDegreeRate";

export interface MetricLayerDefinition {
  key: MetricLayerKey;
  label: string;
  unit: string;
  category: "popular" | "investor" | "hope-core";
}

export const METRIC_LAYERS: MetricLayerDefinition[] = [
  { key: "opportunityScore", label: "Opportunity Index", unit: "0–100", category: "popular" },
  { key: "medianHomeValue", label: "Home Value", unit: "$", category: "popular" },
  { key: "homePriceForecast1yr", label: "1-Year Price Forecast", unit: "%", category: "popular" },
  { key: "overvaluationPct", label: "Overvalued %", unit: "%", category: "popular" },
  { key: "capRate", label: "Cap Rate", unit: "%", category: "popular" },
  { key: "daysOnMarket", label: "Days on Market", unit: "days", category: "investor" },
  { key: "sellerDesperationScore", label: "Seller Desperation Score", unit: "0–100", category: "investor" },
  { key: "marketPsf", label: "Market PSF", unit: "$/sqft", category: "investor" },
  { key: "homeValueGrowthYoy", label: "Home Value Growth YoY", unit: "%", category: "investor" },
  { key: "remoteWorkPct", label: "Remote Work %", unit: "%", category: "hope-core" },
  { key: "homeowners25to44Pct", label: "Homeowners 25–44 %", unit: "%", category: "hope-core" },
  { key: "populationGrowthRate", label: "Population Growth", unit: "%", category: "hope-core" },
  { key: "medianAge", label: "Median Age", unit: "years", category: "hope-core" },
  { key: "walkabilityScore", label: "Walkability Score", unit: "0–100", category: "hope-core" },
  { key: "collegeDegreeRate", label: "College Degree Rate", unit: "%", category: "hope-core" },
];
