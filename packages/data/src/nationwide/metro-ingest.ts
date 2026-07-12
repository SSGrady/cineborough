import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MetroCatalogEntry, MetroZipEntry } from "../metro-catalog/types.ts";
import type { ZipMetricsInput } from "../validation.ts";
import { deriveExtendedMetrics } from "../extended-metrics.ts";
import type { ZhviNormalizedBundle, ZhviZipRecord } from "../ingest/zhvi-sources.ts";
import type { MetroGeometry } from "../types.ts";

interface GeoFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: MetroGeometry;
}

interface GeoFeatureCollection {
  type: "FeatureCollection";
  metadata?: Record<string, unknown>;
  features: GeoFeature[];
}

const TIGERWEB_LAYER =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2024/MapServer/2/query";

const REQUEST_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchZctaPolygon(zip: string): Promise<GeoFeature | null> {
  const url =
    `${TIGERWEB_LAYER}?where=${encodeURIComponent(`ZCTA5='${zip}'`)}` +
    "&outFields=ZCTA5&f=geojson&outSR=4326";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TIGERweb ZCTA ${zip}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GeoFeatureCollection;
  return data.features?.[0] ?? null;
}

export async function fetchMetroBoundaries(
  metro: MetroCatalogEntry,
  outPath: string,
): Promise<{ featureCount: number; missing: string[] }> {
  const features: GeoFeature[] = [];
  const missing: string[] = [];

  for (const entry of metro.zips) {
    console.info(`  [${metro.cbsaCode}] Fetching ZCTA ${entry.zip}...`);
    const raw = await fetchZctaPolygon(entry.zip);
    if (!raw?.geometry) {
      missing.push(entry.zip);
      console.warn(`  [${metro.cbsaCode}] No geometry for ZCTA ${entry.zip}`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    features.push({
      type: "Feature",
      properties: { zip: entry.zip, name: entry.name },
      geometry: raw.geometry,
    });
    await sleep(REQUEST_DELAY_MS);
  }

  const collection: GeoFeatureCollection = {
    type: "FeatureCollection",
    metadata: {
      source: "US Census Bureau TIGER/Line ZCTA (via TIGERweb MapServer)",
      retrieved: new Date().toISOString().slice(0, 10),
      cbsaCode: metro.cbsaCode,
      metro: metro.name,
      sandboxZips: metro.zips.map((z) => z.zip),
    },
    features,
  };

  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(collection)}\n`, "utf8");

  return { featureCount: features.length, missing };
}

function tierFromZhvi(zhvi: number): "premium" | "mid" | "value" {
  if (zhvi >= 500_000) return "premium";
  if (zhvi >= 300_000) return "mid";
  return "value";
}

function tierDefaults(tier: "premium" | "mid" | "value") {
  if (tier === "premium") {
    return {
      homePriceForecast1yr: 2.0,
      overvaluationPct: 8.0,
      capRate: 4.5,
      daysOnMarket: 24,
      sellerDesperationScore: 18,
      marketPsf: 520,
      remoteWorkPct: 36.0,
      homeowners25to44Pct: 40.0,
      populationGrowthRate: 1.5,
      incomeGrowthRate: 4.0,
      medianAge: 35.0,
      walkabilityScore: 72,
      collegeDegreeRate: 58.0,
    };
  }
  if (tier === "mid") {
    return {
      homePriceForecast1yr: 1.5,
      overvaluationPct: 4.0,
      capRate: 5.2,
      daysOnMarket: 32,
      sellerDesperationScore: 26,
      marketPsf: 380,
      remoteWorkPct: 30.0,
      homeowners25to44Pct: 36.0,
      populationGrowthRate: 1.2,
      incomeGrowthRate: 3.5,
      medianAge: 36.5,
      walkabilityScore: 55,
      collegeDegreeRate: 42.0,
    };
  }
  return {
    homePriceForecast1yr: 0.8,
    overvaluationPct: -2.0,
    capRate: 5.8,
    daysOnMarket: 42,
    sellerDesperationScore: 34,
    marketPsf: 260,
    remoteWorkPct: 24.0,
    homeowners25to44Pct: 30.0,
    populationGrowthRate: 0.8,
    incomeGrowthRate: 2.8,
    medianAge: 38.0,
    walkabilityScore: 42,
    collegeDegreeRate: 32.0,
  };
}

function buildZipMetric(
  entry: MetroZipEntry,
  zhviRec?: ZhviZipRecord,
): ZipMetricsInput {
  const zhvi = zhviRec?.zhvi ?? 350_000;
  const tier = tierFromZhvi(zhvi);
  const d = tierDefaults(tier);
  const walkabilityScore = d.walkabilityScore;

  return {
    zip: entry.zip,
    name: entry.name,
    state: entry.state,
    medianHomeValue: zhvi,
    homeValueGrowthYoy: zhviRec?.zhviYoyPct !== null && zhviRec?.zhviYoyPct !== undefined
      ? Math.round(zhviRec.zhviYoyPct * 10) / 10
      : 2.0,
    homePriceForecast1yr: d.homePriceForecast1yr,
    overvaluationPct: d.overvaluationPct,
    capRate: d.capRate,
    daysOnMarket: d.daysOnMarket,
    sellerDesperationScore: d.sellerDesperationScore,
    marketPsf: d.marketPsf,
    priceCutCount: tier === "value" ? 2 : tier === "mid" ? 1 : 0,
    remoteWorkPct: d.remoteWorkPct,
    homeowners25to44Pct: d.homeowners25to44Pct,
    populationGrowthRate: d.populationGrowthRate,
    incomeGrowthRate: d.incomeGrowthRate,
    medianAge: d.medianAge,
    walkabilityScore,
    collegeDegreeRate: d.collegeDegreeRate,
    ...deriveExtendedMetrics(entry.zip, walkabilityScore),
  };
}

export function seedMetroMetrics(
  metro: MetroCatalogEntry,
  zhviZip: ZhviNormalizedBundle,
  outPath: string,
): { zipCount: number } {
  const zips = metro.zips.map((entry) => {
    const zhviRec = zhviZip.records[entry.zip] as ZhviZipRecord | undefined;
    return buildZipMetric(entry, zhviRec);
  });

  const collection = {
    metro: metro.name,
    cbsaCode: metro.cbsaCode,
    zhviMetroRegionId: metro.zhviMetroRegionId,
    updatedAt: new Date().toISOString().slice(0, 10),
    zips,
  };

  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");

  return { zipCount: zips.length };
}

export function seedMetroQuotes(
  metro: MetroCatalogEntry,
  outPath: string,
): void {
  const quotes = {
    quotes: metro.zips.map((z) => ({
      zip: z.zip,
      neighborhood: z.name,
      text: `Neighborhood context for ${z.name} — locale quotes pending curation.`,
      source: "nationwide-seed",
      primaryVibe: z.name,
    })),
  };

  mkdirSync(resolve(outPath, ".."), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(quotes, null, 2)}\n`, "utf8");
}
