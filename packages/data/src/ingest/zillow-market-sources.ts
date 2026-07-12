/**
 * Zillow Research market metrics bulk CSV URLs (ADR-012 / T047).
 * Cross-check source for Redfin DOM, price cuts, and inventory — not primary display path.
 * @see https://www.zillow.com/research/data/
 */
export const ZILLOW_MARKET_CSV_URLS = {
  /** Median days to pending (smoothed, monthly) — listing-side tempo, not sale-side DOM */
  medianDaysToPending:
    "https://files.zillowstatic.com/research/public_csvs/med_doz_pending/Zip_med_doz_pending_uc_sfrcondo_sm_month.csv",
  /** Share of listings with a price cut (smoothed, monthly); raw CSV values are 0–1 fractions */
  priceCutPct:
    "https://files.zillowstatic.com/research/public_csvs/perc_listings_price_cut/Zip_perc_listings_price_cut_uc_sfrcondo_sm_month.csv",
  /** For-sale inventory count (smoothed, monthly) */
  inventory:
    "https://files.zillowstatic.com/research/public_csvs/invt_fs/Zip_invt_fs_uc_sfrcondo_sm_month.csv",
} as const;

export type ZillowMarketMetricKey = keyof typeof ZILLOW_MARKET_CSV_URLS;

export const ZILLOW_MARKET_ATTRIBUTION =
  "Market metrics from Zillow Research bulk data (© Zillow). Cross-check only; Redfin remains primary for DOM and seller desperation.";

export interface ZillowMarketZipRecord {
  zipCode: string;
  regionId: string;
  state: string;
  city: string;
  metro: string;
  county: string;
  /** Median days to pending (Zillow definition) */
  medianDaysToPending: number | null;
  /** Share of listings with price cut, 0–100 scale */
  priceCutPct: number | null;
  /** Active for-sale inventory count */
  inventory: number | null;
}

export interface ZillowMarketNormalizedBundle {
  source: "zillow-research-market";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  geography: "zip";
  recordCount: number;
  records: Record<string, ZillowMarketZipRecord>;
}
