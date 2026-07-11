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

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export type MetroGeometry = PolygonGeometry | MultiPolygonGeometry;

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
  geometry: MetroGeometry;
}

export interface DcMetroGeoJsonMetadata {
  metro: string;
  cbsaCode?: string;
  dataAsOf: string;
  dataAsOfLabel: string;
  sandboxZips: string[];
  generatedAt: string;
  shards?: Array<{ cbsaCode: string; metro: string; sandboxZips: string[] }>;
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

export type MetricLayerCategory =
  | "popular"
  | "investor"
  | "market-trends"
  | "demographics"
  | "hope-core";

export interface MetricLayerDefinition {
  key: MetricLayerKey;
  label: string;
  unit: string;
  category: MetricLayerCategory;
}

/** Property-level valuation — see docs/schema/property-valuation.md */
export interface CalculationBreakdown {
  marketPsf: number;
  similarHomesPsf: number;
  forecastAdjustedValue: number;
  purchaseTrendValue: number;
}

export interface OfferRangesAsIs {
  conservative: number;
  fair: number;
  competitive: number;
}

export interface ComparableSale {
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft: number;
  pricePerSqft: number;
  status: "Sold" | "Pending" | "Active" | string;
}

export interface PropertyRecord {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  listPrice: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft: number;
  breakdown: CalculationBreakdown;
  offerRangesAsIs: OfferRangesAsIs;
  comparables: ComparableSale[];
}

export interface PropertyCollection {
  updatedAt: string;
  properties: PropertyRecord[];
}

export type RenovationTierId = "off" | "light" | "full" | "stud";

export interface RenovationTier {
  id: RenovationTierId;
  label: string;
  costPerSqft: number;
}

export interface ComputedOfferRanges {
  conservative: number;
  fair: number;
  competitive: number;
  listPrice: number;
  renovationCost: number;
}

export const RENOVATION_TIERS: RenovationTier[] = [
  { id: "off", label: "Off (as-is)", costPerSqft: 0 },
  { id: "light", label: "Light", costPerSqft: 35 },
  { id: "full", label: "Full", costPerSqft: 65 },
  { id: "stud", label: "Stud", costPerSqft: 100 },
];

export const METRIC_LAYERS: MetricLayerDefinition[] = [
  { key: "opportunityScore", label: "Opportunity Index", unit: "0–100", category: "popular" },
  { key: "medianHomeValue", label: "Home Value", unit: "$", category: "popular" },
  { key: "homePriceForecast1yr", label: "1-Year Price Forecast", unit: "%", category: "popular" },
  { key: "overvaluationPct", label: "Overvalued %", unit: "%", category: "popular" },
  { key: "capRate", label: "Cap Rate", unit: "%", category: "popular" },
  { key: "sellerDesperationScore", label: "Seller Desperation Score", unit: "0–100", category: "investor" },
  { key: "marketPsf", label: "Market PSF", unit: "$/sqft", category: "investor" },
  { key: "daysOnMarket", label: "Days on Market", unit: "days", category: "market-trends" },
  { key: "homeValueGrowthYoy", label: "Home Value Growth YoY", unit: "%", category: "market-trends" },
  { key: "remoteWorkPct", label: "Remote Work %", unit: "%", category: "demographics" },
  { key: "homeowners25to44Pct", label: "Homeowners 25–44 %", unit: "%", category: "demographics" },
  { key: "populationGrowthRate", label: "Population Growth", unit: "%", category: "demographics" },
  { key: "medianAge", label: "Median Age", unit: "years", category: "demographics" },
  { key: "collegeDegreeRate", label: "College Degree Rate", unit: "%", category: "demographics" },
  { key: "walkabilityScore", label: "Walkability Score", unit: "0–100", category: "hope-core" },
];
