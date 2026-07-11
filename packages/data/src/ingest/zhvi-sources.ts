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

export interface ZhviSeriesPoint {
  date: string;
  zhvi: number;
}

export interface ZhviZipRecord {
  zipCode: string;
  regionId: string;
  state: string;
  city: string;
  metro: string;
  county: string;
  zhvi: number;
  zhviMomPct: number | null;
  zhviYoyPct: number | null;
  series: ZhviSeriesPoint[];
}

export interface ZhviMetroRecord {
  regionId: string;
  name: string;
  state: string;
  regionType: string;
  zhvi: number;
  zhviMomPct: number | null;
  zhviYoyPct: number | null;
  series: ZhviSeriesPoint[];
}

export interface ZhviNormalizedBundle {
  source: "zillow-research-zhvi";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  geography: ZhviGeography;
  recordCount: number;
  records: Record<string, ZhviZipRecord | ZhviMetroRecord>;
}
