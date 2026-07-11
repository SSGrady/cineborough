/**
 * Zillow Research ZHVI bulk CSV URLs (ADR-012).
 * @see https://www.zillow.com/research/data/
 */
export const ZHVI_CSV_URLS = {
  zip: "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
  metro: "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
  city: "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
} as const;

export type ZhviGeography = keyof typeof ZHVI_CSV_URLS;

export const ZHVI_ATTRIBUTION =
  "Home values from Zillow Research ZHVI bulk data (© Zillow). Not for redistribution without attribution.";
