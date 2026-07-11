/**
 * Derived investor market signals from live Redfin bulk ingest (ADR-012 / T049).
 * Formula per docs/schema/metrics-taxonomy.md:
 *   sellerDesperationScore = min(100, (daysOnMarket / 90) * 50 + (priceCutCount * 25))
 * `priceCutCount` proxied from Redfin `price_drops` (% listings with cut): priceDropsPct / 25.
 */
import type { RedfinZipRecord } from "./redfin-sources.ts";

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
