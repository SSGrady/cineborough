/**
 * Derived financial metrics from ZHVI + FHFA HPI (+ ACS income when available).
 * Formulas per ADR-012 / T034 — documented in docs/schema/metrics-taxonomy.md.
 */
import type { ZhviMetroRecord, ZhviZipRecord } from "./zhvi-sources.ts";
import type { FhfaMetroRecord } from "./fhfa-hpi-sources.ts";

export interface DerivedFinancialInputs {
  zhvi: ZhviZipRecord;
  fhfaMetro: FhfaMetroRecord;
  zhviMetro?: ZhviMetroRecord;
  medianHouseholdIncome?: number | null;
  metroMedianHouseholdIncome?: number | null;
}

export interface DerivedFinancialResult {
  homePriceForecast1yr: number;
  overvaluationPct: number;
  /** 0–1 heuristic confidence based on input completeness */
  modelConfidence: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * 1-year home price forecast (%).
 *
 * Blends ZHVI trailing YoY growth (60%) with FHFA metro HPI YoY momentum (40%).
 * When ZHVI series has ≥3 months, annualizes trailing 3-month MoM trend and
 * averages with headline YoY (50/50) before the FHFA blend.
 */
export function computeHomePriceForecast1yr(
  zhviYoyPct: number | null,
  fhfaHpiYoyPct: number | null,
  zhviSeries?: Array<{ date: string; zhvi: number }>,
): number | null {
  let zhviSignal = zhviYoyPct;

  if (zhviSeries && zhviSeries.length >= 3) {
    const recent = zhviSeries.slice(-3);
    let momSum = 0;
    let momCount = 0;
    for (let i = 1; i < recent.length; i++) {
      const prior = recent[i - 1].zhvi;
      const current = recent[i].zhvi;
      if (prior > 0) {
        momSum += ((current - prior) / prior) * 100;
        momCount++;
      }
    }
    if (momCount > 0) {
      const annualizedMom = (momSum / momCount) * 12;
      zhviSignal =
        zhviYoyPct !== null ? (zhviYoyPct + annualizedMom) / 2 : annualizedMom;
    }
  }

  if (zhviSignal === null && fhfaHpiYoyPct === null) return null;

  const zhviPart = zhviSignal ?? fhfaHpiYoyPct ?? 0;
  const fhfaPart = fhfaHpiYoyPct ?? zhviSignal ?? 0;
  const forecast = 0.6 * zhviPart + 0.4 * fhfaPart;

  return round1(clamp(forecast, -15, 25));
}

/**
 * Over/undervaluation vs income-adjusted baseline (%).
 *
 * Primary: zip price-to-income vs metro price-to-income (ACS B19013 when present).
 * Fallback: zip ZHVI vs metro ZHVI relative premium (documented assumption when
 * income is unavailable).
 */
export function computeOvervaluationPct(
  zipZhvi: number,
  metroZhvi: number,
  medianHouseholdIncome?: number | null,
  metroMedianHouseholdIncome?: number | null,
): number | null {
  if (zipZhvi <= 0 || metroZhvi <= 0) return null;

  if (
    medianHouseholdIncome !== null &&
    medianHouseholdIncome !== undefined &&
    medianHouseholdIncome > 0 &&
    metroMedianHouseholdIncome !== null &&
    metroMedianHouseholdIncome !== undefined &&
    metroMedianHouseholdIncome > 0
  ) {
    const zipPti = zipZhvi / medianHouseholdIncome;
    const metroPti = metroZhvi / metroMedianHouseholdIncome;
    if (metroPti <= 0) return null;
    return round1(clamp(((zipPti / metroPti) - 1) * 100, -40, 60));
  }

  return round1(clamp(((zipZhvi / metroZhvi) - 1) * 100, -40, 60));
}

export function deriveFinancialMetrics(input: DerivedFinancialInputs): DerivedFinancialResult | null {
  const { zhvi, fhfaMetro, zhviMetro, medianHouseholdIncome, metroMedianHouseholdIncome } = input;

  const forecast = computeHomePriceForecast1yr(
    zhvi.zhviYoyPct,
    fhfaMetro.hpiYoyPct,
    zhvi.series,
  );
  if (forecast === null) return null;

  const metroZhvi = zhviMetro?.zhvi ?? zhvi.zhvi;
  const overvaluation = computeOvervaluationPct(
    zhvi.zhvi,
    metroZhvi,
    medianHouseholdIncome,
    metroMedianHouseholdIncome,
  );
  if (overvaluation === null) return null;

  const hasIncome =
    medianHouseholdIncome !== null &&
    medianHouseholdIncome !== undefined &&
    medianHouseholdIncome > 0 &&
    metroMedianHouseholdIncome !== null &&
    metroMedianHouseholdIncome !== undefined &&
    metroMedianHouseholdIncome > 0;

  const modelConfidence = hasIncome ? 0.75 : zhviMetro ? 0.55 : 0.45;

  return {
    homePriceForecast1yr: forecast,
    overvaluationPct: overvaluation,
    modelConfidence,
  };
}
