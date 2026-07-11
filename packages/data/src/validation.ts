import type { HopeCoreMetrics, InvestorMetrics, ZipMetrics, ZipMetricsCollection } from "./types";

/** DC metro sandbox ZIPs — see ADR-004 */
export const SANDBOX_ZIPS = ["22201", "22202", "22204", "20814", "20001"] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || isFiniteNumber(value);
}

export function isInvestorMetrics(value: unknown): value is InvestorMetrics {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    isFiniteNumber(m.homePriceForecast1yr) &&
    isFiniteNumber(m.overvaluationPct) &&
    isFiniteNumber(m.capRate) &&
    isFiniteNumber(m.daysOnMarket) &&
    isFiniteNumber(m.sellerDesperationScore) &&
    isFiniteNumber(m.marketPsf) &&
    isFiniteNumber(m.homeValueGrowthYoy) &&
    isFiniteNumber(m.medianHomeValue) &&
    isOptionalFiniteNumber(m.priceCutCount)
  );
}

export function isHopeCoreMetrics(value: unknown): value is HopeCoreMetrics {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    isFiniteNumber(m.remoteWorkPct) &&
    isFiniteNumber(m.homeowners25to44Pct) &&
    isFiniteNumber(m.populationGrowthRate) &&
    isFiniteNumber(m.incomeGrowthRate) &&
    isFiniteNumber(m.medianAge) &&
    isFiniteNumber(m.walkabilityScore) &&
    isFiniteNumber(m.collegeDegreeRate)
  );
}

/** Raw ZIP record from mock JSON (opportunityScore computed at load time). */
export type ZipMetricsInput = Omit<ZipMetrics, "opportunityScore" | "opportunityScoreNormalized">;

export function isZipMetricsInput(value: unknown): value is ZipMetricsInput {
  if (typeof value !== "object" || value === null) return false;
  const z = value as Record<string, unknown>;
  return (
    typeof z.zip === "string" &&
    typeof z.name === "string" &&
    typeof z.state === "string" &&
    isInvestorMetrics(z) &&
    isHopeCoreMetrics(z)
  );
}

export function validateZipMetricsCollection(data: unknown): ZipMetricsCollection {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid zip metrics collection: expected object");
  }

  const collection = data as Record<string, unknown>;

  if (typeof collection.metro !== "string" || typeof collection.updatedAt !== "string") {
    throw new Error("Invalid zip metrics collection: missing metro or updatedAt");
  }

  if (!Array.isArray(collection.zips)) {
    throw new Error("Invalid zip metrics collection: zips must be an array");
  }

  const zips: ZipMetricsInput[] = [];
  for (const zip of collection.zips) {
    if (!isZipMetricsInput(zip)) {
      throw new Error(`Invalid ZIP metrics record: ${JSON.stringify(zip)}`);
    }
    zips.push(zip);
  }

  const zipCodes = zips.map((z) => z.zip);
  for (const expected of SANDBOX_ZIPS) {
    if (!zipCodes.includes(expected)) {
      throw new Error(`Missing sandbox ZIP: ${expected}`);
    }
  }

  return {
    metro: collection.metro,
    updatedAt: collection.updatedAt,
    zips: zips as ZipMetrics[],
  };
}
