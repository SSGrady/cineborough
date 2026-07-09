import dcMetroGeoJson from "../../../data/mock/dc-metro.geojson";
import type {
  DcMetroFeatureProperties,
  DcMetroGeoJson,
  MetricLayerKey,
  ZipMetrics,
  ZipMetricsCollection,
} from "./types";
import { normalizeScores } from "./opportunity-index";

/** @deprecated Use loadDcMetroGeoJson() — boundaries are embedded in dc-metro.geojson */
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
    medianAge: props.medianAge,
    walkabilityScore: props.walkScore,
    collegeDegreeRate: props.collegeDegreeRate,
  };
  return map[key];
}

export function getNormalizedMetricValuesFromGeoJson(
  collection: DcMetroGeoJson,
  key: MetricLayerKey,
): Map<string, number> {
  const features = collection.features;

  if (key === "opportunityScore") {
    return new Map(
      features.map((f) => [
        f.properties.zipCode,
        f.properties.opportunityScoreNormalized,
      ]),
    );
  }

  const raw = features.map((f) => getRawMetricFromFeature(f.properties, key));
  const normalized = normalizeScores(raw);
  return new Map(features.map((f, i) => [f.properties.zipCode, normalized[i]]));
}
