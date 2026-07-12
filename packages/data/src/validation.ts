import type { HopeCoreMetrics, InvestorMetrics, ZipMetrics, ZipMetricsCollection } from "./types";

/** DC metro sandbox ZIPs — see ADR-004 (expanded S008) */
export const SANDBOX_ZIPS = [
  "22201",
  "22202",
  "22203",
  "22204",
  "22205",
  "22206",
  "22207",
  "20001",
  "20002",
  "20003",
  "20009",
  "20037",
  "22301",
  "22302",
  "22304",
  "20814",
  "20815",
  "20816",
] as const;

/** SF-Oakland-Berkeley metro sandbox ZIPs — SF neighborhoods + East Bay anchors */
export const SF_BAY_SANDBOX_ZIPS = [
  "94102",
  "94103",
  "94107",
  "94109",
  "94110",
  "94114",
  "94117",
  "94122",
  "94123",
  "94131",
  "94601",
  "94607",
  "94611",
  "94704",
  "94705",
  "94596",
  "94520",
  "94549",
] as const;

/** San Jose-Sunnyvale-Santa Clara metro sandbox ZIPs */
export const SAN_JOSE_SANDBOX_ZIPS = [
  "95110",
  "95112",
  "95116",
  "95125",
  "95126",
  "95128",
  "95129",
  "94086",
  "95050",
  "94301",
  "94306",
  "94040",
  "95014",
  "95008",
  "95030",
  "95035",
] as const;

/** Orlando metro sandbox ZIPs */
export const ORLANDO_SANDBOX_ZIPS = [
  "32801",
  "32803",
  "32804",
  "32805",
  "32806",
  "32807",
  "32814",
  "32819",
  "32822",
  "32825",
  "32828",
  "32832",
  "32835",
  "32789",
  "34741",
  "34747",
] as const;

/** All sandbox ZCTAs for ACS / ZHVI zip ingest */
export const ALL_SANDBOX_ZIPS = [
  ...SANDBOX_ZIPS,
  ...ORLANDO_SANDBOX_ZIPS,
  ...SF_BAY_SANDBOX_ZIPS,
  ...SAN_JOSE_SANDBOX_ZIPS,
] as const;

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

export function validateZipMetricsCollection(
  data: unknown,
  expectedZips: readonly string[] = SANDBOX_ZIPS,
): ZipMetricsCollection {
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
  for (const expected of expectedZips) {
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
