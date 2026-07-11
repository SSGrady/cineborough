import dcMetroGeoJson from "../../../data/metros/47900.geojson";
import type {
  DcMetroFeatureProperties,
  DcMetroGeoJson,
  MetricLayerKey,
  ZipMetrics,
  ZipMetricsCollection,
} from "./types";
import {
  normalizeForecastToFixedScore,
  normalizeScores,
  normalizeToTercileScores,
} from "./opportunity-index";

/** @deprecated Use loadDcMetroGeoJson() — boundaries are embedded in data/metros/47900.geojson */
export { loadZipBoundaries } from "./boundaries";

export function loadDcMetroGeoJson(): DcMetroGeoJson {
  return dcMetroGeoJson as unknown as DcMetroGeoJson;
}

/** Map unified feature properties back to legacy ZipMetrics shape. */
export function featurePropertiesToZipMetrics(props: DcMetroFeatureProperties): ZipMetrics {
  return {
    zip: props.zipCode,
    name: props.neighborhoodName,
    state: props.state,
    homePriceForecast1yr: props.oneYearForecastPct,
    overvaluationPct: props.overvaluationPct,
    capRate: props.capRatePct,
    daysOnMarket: props.daysOnMarket,
    sellerDesperationScore: props.sellerDesperationScore,
    marketPsf: props.marketPsf,
    homeValueGrowthYoy: props.homeValueGrowthYoy,
    medianHomeValue: props.medianHomeValue,
    priceCutCount: props.priceCutCount,
    remoteWorkPct: props.remoteWorkPct,
    homeowners25to44Pct: props.homeowners25to44Pct,
    populationGrowthRate: props.populationGrowthRate,
    incomeGrowthRate: props.incomeGrowthRate ?? 0,
    medianAge: props.medianAge,
    walkabilityScore: props.walkScore,
    collegeDegreeRate: props.collegeDegreeRate,
    opportunityScore: props.opportunityScore,
    opportunityScoreNormalized: props.opportunityScoreNormalized,
  };
}

/** Extract legacy ZipMetrics[] from unified GeoJSON for sidebar/detail panels. */
export function zipMetricsFromGeoJson(collection: DcMetroGeoJson): ZipMetrics[] {
  return collection.features.map((f) => featurePropertiesToZipMetrics(f.properties));
}

/** Build ZipMetricsCollection metadata wrapper from unified GeoJSON. */
export function zipMetricsCollectionFromGeoJson(collection: DcMetroGeoJson): ZipMetricsCollection {
  return {
    metro: collection.metadata.metro,
    updatedAt: collection.metadata.dataAsOf,
    zips: zipMetricsFromGeoJson(collection),
  };
}

export function getFeatureByZipCode(
  collection: DcMetroGeoJson,
  zipCode: string,
): DcMetroFeatureProperties | undefined {
  return collection.features.find((f) => f.properties.zipCode === zipCode)?.properties;
}

export function getRawMetricFromFeature(
  props: DcMetroFeatureProperties,
  key: MetricLayerKey,
): number {
  const map: Record<MetricLayerKey, number> = {
    opportunityScore: props.opportunityScore,
    medianHomeValue: props.medianHomeValue,
    homePriceForecast1yr: props.oneYearForecastPct,
    overvaluationPct: props.overvaluationPct,
    capRate: props.capRatePct,
    daysOnMarket: props.daysOnMarket,
    sellerDesperationScore: props.sellerDesperationScore,
    marketPsf: props.marketPsf,
    homeValueGrowthYoy: props.homeValueGrowthYoy,
    remoteWorkPct: props.remoteWorkPct,
    homeowners25to44Pct: props.homeowners25to44Pct,
    populationGrowthRate: props.populationGrowthRate,
    incomeGrowthRate: props.incomeGrowthRate ?? 0,
    medianAge: props.medianAge,
    walkabilityScore: props.walkScore,
    collegeDegreeRate: props.collegeDegreeRate,
  };
  return map[key];
}

const VALUE_GRADIENT_METRICS = new Set<MetricLayerKey>(["marketPsf"]);
/** Low raw values map to green (affordable homes, younger residents). */
const AFFORDABILITY_TERCILE_METRICS = new Set<MetricLayerKey>([
  "medianHomeValue",
  "medianAge",
]);
/** Absolute thresholds — not data-driven terciles. */
const FIXED_THRESHOLD_METRICS = new Set<MetricLayerKey>(["homePriceForecast1yr"]);

export type ChoroplethPalette = "value" | "opportunity";

export interface ChoroplethSpec {
  palette: ChoroplethPalette;
  colorByZip: Map<string, number>;
  tercileBounds?: { p33: number; p66: number };
}

export function choroplethPaletteForMetricKey(key: MetricLayerKey): ChoroplethPalette {
  return VALUE_GRADIENT_METRICS.has(key) ? "value" : "opportunity";
}

export function getChoroplethSpecFromGeoJson(
  collection: DcMetroGeoJson,
  key: MetricLayerKey,
): ChoroplethSpec {
  const features = collection.features;
  const palette = choroplethPaletteForMetricKey(key);

  if (key === "opportunityScore") {
    return {
      palette,
      colorByZip: new Map(
        features.map((f) => [
          f.properties.zipCode,
          f.properties.opportunityScoreNormalized,
        ]),
      ),
    };
  }

  const raw = features.map((f) => getRawMetricFromFeature(f.properties, key));

  if (palette === "value") {
    const normalized = normalizeScores(raw);
    return {
      palette,
      colorByZip: new Map(features.map((f, i) => [f.properties.zipCode, normalized[i]])),
    };
  }

  if (FIXED_THRESHOLD_METRICS.has(key)) {
    return {
      palette,
      colorByZip: new Map(
        features.map((f, i) => [
          f.properties.zipCode,
          normalizeForecastToFixedScore(raw[i]),
        ]),
      ),
    };
  }

  const dataMask = features.map((f) => f.properties.medianHomeValue > 0);
  const dataValues = raw.filter((_, i) => dataMask[i]);
  const { scores: dataScores, p33, p66 } = normalizeToTercileScores(dataValues, {
    invert: AFFORDABILITY_TERCILE_METRICS.has(key),
  });
  let dataIndex = 0;
  const scores = raw.map((_, i) => {
    if (!dataMask[i]) return 0;
    return dataScores[dataIndex++];
  });

  return {
    palette,
    colorByZip: new Map(features.map((f, i) => [f.properties.zipCode, scores[i]])),
    tercileBounds: dataValues.length > 0 ? { p33, p66 } : undefined,
  };
}

export function getNormalizedMetricValuesFromGeoJson(
  collection: DcMetroGeoJson,
  key: MetricLayerKey,
): Map<string, number> {
  return getChoroplethSpecFromGeoJson(collection, key).colorByZip;
}
