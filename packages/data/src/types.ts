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
  incomeGrowthRate: number;
  medianAge: number;
  walkabilityScore: number;
  collegeDegreeRate: number;
  /** OSM park proxy — min(100, parkCount × 15 + parkAreaHa × 2) per ZCTA (T089) */
  parkScoreProxy: number;
  /** Healthcare practitioners per 10k — ACS B08124-derived (T089) */
  physiciansPer10k: number;
  /** Static 1–10 mock until GreatSchools ADR (T089) */
  schoolRatingPlaceholder: number;
  /** OSRM driving minutes to nearest major airport per sandbox (T089 mock) */
  airportDriveMin: number;
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
  /** ACS B19013 YoY when ingest provides prior vintage; optional on legacy shards */
  incomeGrowthRate?: number;
  medianAge: number;
  walkScore: number;
  collegeDegreeRate: number;
  parkScoreProxy?: number;
  physiciansPer10k?: number;
  schoolRatingPlaceholder?: number;
  airportDriveMin?: number;
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
  | "incomeGrowthRate"
  | "medianAge"
  | "walkabilityScore"
  | "collegeDegreeRate"
  | "parkScoreProxy"
  | "physiciansPer10k"
  | "schoolRatingPlaceholder"
  | "airportDriveMin";

/** Choropleth sidebar categories — WMIL visual polish (T074). */
export type MetricLayerCategory =
  | "demographics"
  | "market-economics"
  | "lifestyle-walkability"
  | "investor-signals"
  | "education-schools";

/** Criterion picker categories — ADR-014 §5 (distinct from sidebar). */
export type CriterionCategory =
  | "housing-market"
  | "demographics"
  | "education"
  | "environment"
  | "health"
  | "commute-access"
  | "investor-signals";

export const METRIC_CATEGORY_LABELS: Record<MetricLayerCategory, string> = {
  demographics: "Demographics",
  "market-economics": "Market & Economics",
  "lifestyle-walkability": "Lifestyle & Walkability",
  "investor-signals": "Investor Signals",
  "education-schools": "Education & Schools",
};

export const METRIC_CATEGORY_ORDER: MetricLayerCategory[] = [
  "demographics",
  "market-economics",
  "lifestyle-walkability",
  "investor-signals",
  "education-schools",
];

export interface MetricLayerDefinition {
  key: MetricLayerKey;
  label: string;
  unit: string;
  /** Choropleth sidebar grouping */
  category: MetricLayerCategory;
  /** Criterion / discovery filter grouping (defaults to category when omitted) */
  criterionCategory?: CriterionCategory;
  /** Short plain-language hint for sidebar (2–3 words) */
  helperText?: string;
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
  {
    key: "medianAge",
    label: "Median Age",
    unit: "years",
    category: "demographics",
    criterionCategory: "demographics",
    helperText: "Typical resident age",
  },
  {
    key: "populationGrowthRate",
    label: "Population Growth",
    unit: "%",
    category: "demographics",
    criterionCategory: "demographics",
    helperText: "People moving in",
  },
  {
    key: "remoteWorkPct",
    label: "Remote Work %",
    unit: "%",
    category: "demographics",
    criterionCategory: "demographics",
    helperText: "Work from home",
  },
  {
    key: "homeowners25to44Pct",
    label: "Homeowners 25–44 %",
    unit: "%",
    category: "demographics",
    helperText: "Young homeowners",
  },
  {
    key: "opportunityScore",
    label: "Opportunity Index",
    unit: "0–100",
    category: "market-economics",
    helperText: "ROI + livability",
  },
  {
    key: "medianHomeValue",
    label: "Median Home Price",
    unit: "$",
    category: "market-economics",
    criterionCategory: "housing-market",
    helperText: "Typical sale price",
  },
  {
    key: "homePriceForecast1yr",
    label: "1-Yr Price Forecast",
    unit: "%",
    category: "market-economics",
    criterionCategory: "housing-market",
    helperText: "Expected price change",
  },
  {
    key: "capRate",
    label: "Cap Rate",
    unit: "%",
    category: "market-economics",
    criterionCategory: "housing-market",
    helperText: "Rental yield %",
  },
  {
    key: "daysOnMarket",
    label: "Days on Market",
    unit: "days",
    category: "market-economics",
    criterionCategory: "housing-market",
    helperText: "Avg listing time",
  },
  {
    key: "homeValueGrowthYoy",
    label: "Home Value Growth",
    unit: "%",
    category: "market-economics",
    criterionCategory: "housing-market",
    helperText: "Past year change",
  },
  {
    key: "walkabilityScore",
    label: "Walk Score",
    unit: "0–100",
    category: "lifestyle-walkability",
    criterionCategory: "environment",
    helperText: "Walk to amenities",
  },
  {
    key: "overvaluationPct",
    label: "Overvaluation %",
    unit: "%",
    category: "investor-signals",
    criterionCategory: "investor-signals",
    helperText: "Vs fair value",
  },
  {
    key: "sellerDesperationScore",
    label: "Seller Motivation",
    unit: "0–100",
    category: "investor-signals",
    criterionCategory: "housing-market",
    helperText: "Negotiation leverage",
  },
  {
    key: "marketPsf",
    label: "Market PSF",
    unit: "$/sqft",
    category: "investor-signals",
    criterionCategory: "investor-signals",
    helperText: "Price per sq ft",
  },
  {
    key: "collegeDegreeRate",
    label: "Education Level",
    unit: "%",
    category: "education-schools",
    criterionCategory: "education",
    helperText: "College-educated %",
  },
  {
    key: "parkScoreProxy",
    label: "Park Score",
    unit: "0–100",
    category: "lifestyle-walkability",
    criterionCategory: "environment",
    helperText: "Parks & green space",
  },
  {
    key: "physiciansPer10k",
    label: "Physicians / 10k",
    unit: "per 10k",
    category: "demographics",
    criterionCategory: "health",
    helperText: "Healthcare access",
  },
  {
    key: "schoolRatingPlaceholder",
    label: "School Rating",
    unit: "1–10",
    category: "education-schools",
    criterionCategory: "education",
    helperText: "Placeholder mock",
  },
  {
    key: "airportDriveMin",
    label: "Airport Drive Time",
    unit: "min",
    category: "lifestyle-walkability",
    criterionCategory: "commute-access",
    helperText: "Minutes to airport",
  },
];
