/**
 * Redfin Data Center market tracker bulk URLs (ADR-012 / T046).
 * @see https://www.redfin.com/news/data-center/
 */
export const REDFIN_MARKET_TRACKER_URLS = {
  zip:
    "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz",
} as const;

export type RedfinGeography = keyof typeof REDFIN_MARKET_TRACKER_URLS;

export const REDFIN_ATTRIBUTION =
  "Market trends from Redfin Data Center bulk download. Display with Redfin attribution per Terms of Use.";

/** Redfin ZIP TSV uses 90-day rolling windows; "monthly" accepted when present in future vintages. */
export const REDFIN_MONTHLY_PERIOD_DURATIONS = new Set(["monthly", "90", "30"]);

export const REDFIN_ALL_RESIDENTIAL_PROPERTY_TYPE = "All Residential";

export interface RedfinZipRecord {
  zipCode: string;
  region: string;
  state: string;
  periodBegin: string;
  periodEnd: string;
  periodDuration: string;
  medianDom: number | null;
  medianPpsf: number | null;
  monthsOfSupply: number | null;
  /** Share of listings with a price drop (0–100); maps to priceCutCount proxy in derived formula */
  priceDropsPct: number | null;
  inventory: number | null;
  propertyType: string;
}

export interface RedfinNormalizedBundle {
  source: "redfin-market-tracker";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  geography: RedfinGeography;
  recordCount: number;
  records: Record<string, RedfinZipRecord>;
}
