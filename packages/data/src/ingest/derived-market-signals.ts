/**
 * Derived investor market signals from live Redfin bulk ingest (ADR-012 / T049).
 * Formula per docs/schema/metrics-taxonomy.md:
 *   sellerDesperationScore = min(100, (daysOnMarket / 90) * 50 + (priceCutCount * 25))
 * `priceCutCount` proxied from Redfin `price_drops` (% listings with cut): priceDropsPct / 25.
 *
 * T047: optional Zillow Research cross-check overlay — Redfin remains primary.
 */
import type { RedfinZipRecord } from "./redfin-sources.ts";
import type { ZillowMarketZipRecord } from "./zillow-market-sources.ts";

export interface SellerDesperationInputs {
  daysOnMarket: number;
  priceDropsPct: number | null;
}

export interface SellerDesperationResult {
  sellerDesperationScore: number;
  priceCutCount: number;
}

/** Map Redfin price-drop share (0–100) to taxonomy priceCutCount proxy (0–4 scale). */
export function priceCutCountFromRedfin(priceDropsPct: number | null): number {
  if (priceDropsPct === null || priceDropsPct <= 0) return 0;
  return Math.round((priceDropsPct / 25) * 10) / 10;
}

/**
 * Seller desperation score (0–100) from DOM + price-cut proxy.
 * DOM component maxes at 50 when median DOM ≥ 90 days; cut component maxes at 100 when
 * price-drop share ≥ 100% (priceCutCount ≥ 4).
 */
export function computeSellerDesperationScore(
  daysOnMarket: number,
  priceDropsPct: number | null,
): SellerDesperationResult {
  const domComponent = (daysOnMarket / 90) * 50;
  const priceCutCount = priceCutCountFromRedfin(priceDropsPct);
  const cutComponent = priceCutCount * 25;
  const sellerDesperationScore = Math.min(100, Math.round(domComponent + cutComponent));

  return { sellerDesperationScore, priceCutCount };
}

export function deriveSellerDesperationFromRedfin(
  record: RedfinZipRecord,
): SellerDesperationResult | null {
  if (record.medianDom === null || record.medianDom < 0) return null;
  return computeSellerDesperationScore(record.medianDom, record.priceDropsPct);
}

/** Tolerance bands for Redfin vs Zillow cross-check (definitions differ by design). */
export const ZILLOW_CROSS_CHECK = {
  domAbsDays: 20,
  domRelPct: 0.5,
  priceCutAbsPct: 15,
} as const;

export interface ZillowMarketCrossCheck {
  zipCode: string;
  zillowMedianDaysToPending: number | null;
  zillowPriceCutPct: number | null;
  zillowInventory: number | null;
  redfinMedianDom: number | null;
  redfinPriceDropsPct: number | null;
  redfinInventory: number | null;
  domDeltaDays: number | null;
  priceCutDeltaPct: number | null;
  /** True when both comparable signals are within tolerance */
  aligned: boolean;
}

function withinDomTolerance(redfinDom: number, zillowDom: number): boolean {
  const delta = Math.abs(redfinDom - zillowDom);
  const rel = redfinDom > 0 ? delta / redfinDom : delta;
  return delta <= ZILLOW_CROSS_CHECK.domAbsDays || rel <= ZILLOW_CROSS_CHECK.domRelPct;
}

function withinPriceCutTolerance(redfinPct: number, zillowPct: number): boolean {
  return Math.abs(redfinPct - zillowPct) <= ZILLOW_CROSS_CHECK.priceCutAbsPct;
}

/** Cross-check Redfin primary signals against optional Zillow Research bulk overlay. */
export function crossCheckRedfinWithZillow(
  redfin: RedfinZipRecord,
  zillow: ZillowMarketZipRecord,
): ZillowMarketCrossCheck {
  const domDeltaDays =
    redfin.medianDom !== null && zillow.medianDaysToPending !== null
      ? Math.round((redfin.medianDom - zillow.medianDaysToPending) * 10) / 10
      : null;

  const priceCutDeltaPct =
    redfin.priceDropsPct !== null && zillow.priceCutPct !== null
      ? Math.round((redfin.priceDropsPct - zillow.priceCutPct) * 10) / 10
      : null;

  let aligned = true;
  if (
    redfin.medianDom !== null &&
    zillow.medianDaysToPending !== null &&
    !withinDomTolerance(redfin.medianDom, zillow.medianDaysToPending)
  ) {
    aligned = false;
  }
  if (
    redfin.priceDropsPct !== null &&
    zillow.priceCutPct !== null &&
    !withinPriceCutTolerance(redfin.priceDropsPct, zillow.priceCutPct)
  ) {
    aligned = false;
  }

  return {
    zipCode: redfin.zipCode,
    zillowMedianDaysToPending: zillow.medianDaysToPending,
    zillowPriceCutPct: zillow.priceCutPct,
    zillowInventory: zillow.inventory,
    redfinMedianDom: redfin.medianDom,
    redfinPriceDropsPct: redfin.priceDropsPct,
    redfinInventory: redfin.inventory,
    domDeltaDays,
    priceCutDeltaPct,
    aligned,
  };
}
