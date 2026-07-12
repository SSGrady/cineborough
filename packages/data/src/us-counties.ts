import sandboxCountiesGeoJson from "../../../data/boundaries/sandbox-counties.geojson";
import type { DcMetroFeature, DcMetroGeoJson, MetricLayerKey, MetroGeometry, DcMetroFeatureProperties } from "./types";
import { getRawMetricFromFeature } from "./dc-metro-geojson";
import { ZIP_TO_COUNTY, COUNTY_FIPS_TO_NAME, SANDBOX_COUNTY_FIPS } from "./zip-to-county";

interface RawCountyFeature {
  type: "Feature";
  id: string;
  properties: { geoid: string; name: string };
  geometry: MetroGeometry;
}

interface RawCountyCollection {
  type: "FeatureCollection";
  features: RawCountyFeature[];
}

function ringArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}

function exteriorRings(geometry: MetroGeometry): number[][][] {
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  return geometry.coordinates.map((polygon) => polygon[0]);
}

function polygonLabelPoint(geometry: MetroGeometry): { lng: number; lat: number } {
  const rings = exteriorRings(geometry);
  const largest = rings.reduce((best, ring) => (ringArea(ring) > ringArea(best) ? ring : best));
  if (!largest || largest.length === 0) return { lng: -96.5, lat: 39.2 };
  let sumLng = 0;
  let sumLat = 0;
  const n = largest.length - 1;
  for (let i = 0; i < n; i++) {
    sumLng += largest[i][0];
    sumLat += largest[i][1];
  }
  return { lng: sumLng / n, lat: sumLat / n };
}

function aggregateZipsByCounty(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): Map<string, { value: number; count: number; opportunityScore: number; medianHomeValue: number }> {
  const byCounty = new Map<string, { total: number; count: number; oppTotal: number; hvTotal: number }>();

  for (const f of metros.features) {
    if (f.properties.medianHomeValue <= 0) continue;
    const zip = f.properties.zipCode?.trim();
    if (!zip) continue;
    const countyFips = ZIP_TO_COUNTY[zip];
    if (!countyFips) continue;

    const value = getRawMetricFromFeature(f.properties, activeMetric);
    const entry = byCounty.get(countyFips) ?? { total: 0, count: 0, oppTotal: 0, hvTotal: 0 };
    entry.total += value;
    entry.count += 1;
    entry.oppTotal += f.properties.opportunityScoreNormalized;
    entry.hvTotal += f.properties.medianHomeValue;
    byCounty.set(countyFips, entry);
  }

  return new Map(
    Array.from(byCounty.entries()).map(([fips, entry]) => [
      fips,
      {
        value: entry.total / entry.count,
        count: entry.count,
        opportunityScore: entry.oppTotal / entry.count,
        medianHomeValue: entry.hvTotal / entry.count,
      },
    ]),
  );
}

function setAggregatedMetric(
  props: DcMetroFeatureProperties,
  key: MetricLayerKey,
  value: number,
): void {
  switch (key) {
    case "opportunityScore":
      props.opportunityScore = value;
      break;
    case "medianHomeValue":
      props.medianHomeValue = value;
      break;
    case "homePriceForecast1yr":
      props.oneYearForecastPct = value;
      break;
    case "overvaluationPct":
      props.overvaluationPct = value;
      break;
    case "capRate":
      props.capRatePct = value;
      break;
    case "daysOnMarket":
      props.daysOnMarket = value;
      break;
    case "sellerDesperationScore":
      props.sellerDesperationScore = value;
      break;
    case "marketPsf":
      props.marketPsf = value;
      break;
    case "homeValueGrowthYoy":
      props.homeValueGrowthYoy = value;
      break;
    case "remoteWorkPct":
      props.remoteWorkPct = value;
      break;
    case "homeowners25to44Pct":
      props.homeowners25to44Pct = value;
      break;
    case "populationGrowthRate":
      props.populationGrowthRate = value;
      break;
    case "incomeGrowthRate":
      props.incomeGrowthRate = value;
      break;
    case "medianAge":
      props.medianAge = value;
      break;
    case "walkabilityScore":
      props.walkScore = value;
      break;
    case "collegeDegreeRate":
      props.collegeDegreeRate = value;
      break;
    default:
      break;
  }
}

function blankProperties(
  regionId: string,
  name: string,
  lng: number,
  lat: number,
): DcMetroFeature["properties"] {
  return {
    zipCode: regionId,
    neighborhoodName: name,
    state: "",
    medianHomeValue: 0,
    oneYearForecastPct: 0,
    overvaluationPct: 0,
    capRatePct: 0,
    daysOnMarket: 0,
    sellerDesperationScore: 0,
    marketPsf: 0,
    homeValueGrowthYoy: 0,
    priceCutCount: 0,
    remoteWorkPct: 0,
    homeowners25to44Pct: 0,
    populationGrowthRate: 0,
    medianAge: 0,
    walkScore: 0,
    collegeDegreeRate: 0,
    localQuote: "",
    primaryVibe: name,
    opportunityScore: 0,
    opportunityScoreNormalized: 0,
    fillColor: "#94a3b8",
    fillColorRgb: [148, 163, 184],
    labelLng: lng,
    labelLat: lat,
  };
}

export function loadSandboxCountiesGeoJson(): RawCountyCollection {
  return sandboxCountiesGeoJson as unknown as RawCountyCollection;
}

/** County-level choropleth — aggregates sandbox ZIP metrics by county FIPS. */
export function buildCountyChoroplethFromShards(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): DcMetroGeoJson {
  const counties = loadSandboxCountiesGeoJson();
  const byCounty = aggregateZipsByCounty(metros, activeMetric);
  const allowedFips = new Set<string>(SANDBOX_COUNTY_FIPS);

  const features: DcMetroFeature[] = counties.features
    .filter((f) => allowedFips.has(f.id))
    .map((feature) => {
      const fips = feature.id;
      const name = COUNTY_FIPS_TO_NAME[fips] ?? feature.properties.name;
      const labelPoint = polygonLabelPoint(feature.geometry);
      const agg = byCounty.get(fips);

      const props = blankProperties(fips, name, labelPoint.lng, labelPoint.lat);

      if (agg) {
        setAggregatedMetric(props, activeMetric, agg.value);
        props.medianHomeValue = agg.medianHomeValue;
        props.opportunityScore = agg.opportunityScore;
      }

      return { type: "Feature", properties: props, geometry: feature.geometry };
    });

  return {
    type: "FeatureCollection",
    metadata: metros.metadata,
    features,
  };
}
