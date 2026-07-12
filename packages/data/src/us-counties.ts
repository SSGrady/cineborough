import usCountiesGeoJson from "../../../data/boundaries/us-counties-20m.geojson";
import sandboxCountiesGeoJson from "../../../data/boundaries/sandbox-counties.geojson";
import type { DcMetroFeature, DcMetroGeoJson, MetricLayerKey, MetroGeometry, DcMetroFeatureProperties } from "./types";
import { getRawMetricFromFeature } from "./dc-metro-geojson";
import { normalizeScores } from "./opportunity-index";
import { STATE_FIPS_TO_ABBR } from "./us-states";
import { ZIP_TO_COUNTY, COUNTY_FIPS_TO_NAME, SANDBOX_COUNTY_FIPS } from "./zip-to-county";

interface RawCountyFeature {
  type: "Feature";
  id: string;
  properties: { geoid: string; name: string; stateFips?: string };
  geometry: MetroGeometry;
}

interface RawCountyCollection {
  type: "FeatureCollection";
  features: RawCountyFeature[];
}

/** Continental lower-48 + DC — exclude AK (02), HI (15) */
export const CONTINENTAL_EXCLUDED_STATE_FIPS = new Set(["02", "15", "60", "66", "69", "72", "78"]);

const STATE_ABBR_TO_FIPS = Object.fromEntries(
  Object.entries(STATE_FIPS_TO_ABBR).map(([fips, abbr]) => [abbr, fips]),
);

interface CountyAggregate {
  value: number;
  count: number;
  opportunityScore: number;
  medianHomeValue: number;
  hasDirectMetro: boolean;
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

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lng: number, lat: number, geometry: MetroGeometry): boolean {
  if (geometry.type === "Polygon") {
    const [exterior, ...holes] = geometry.coordinates;
    if (!exterior || !pointInRing(lng, lat, exterior)) return false;
    return !holes.some((hole) => pointInRing(lng, lat, hole));
  }
  return geometry.coordinates.some((polygon) => {
    const [exterior, ...holes] = polygon;
    if (!exterior || !pointInRing(lng, lat, exterior)) return false;
    return !holes.some((hole) => pointInRing(lng, lat, hole));
  });
}

function countiesByStateFips(counties: RawCountyCollection): Map<string, RawCountyFeature[]> {
  const byState = new Map<string, RawCountyFeature[]>();
  for (const feature of counties.features) {
    const stateFips = feature.properties.stateFips ?? feature.id.slice(0, 2);
    if (CONTINENTAL_EXCLUDED_STATE_FIPS.has(stateFips)) continue;
    const list = byState.get(stateFips) ?? [];
    list.push(feature);
    byState.set(stateFips, list);
  }
  return byState;
}

function resolveCountyForMetro(
  lng: number,
  lat: number,
  stateAbbr: string,
  countiesByState: Map<string, RawCountyFeature[]>,
): string | null {
  const stateFips = STATE_ABBR_TO_FIPS[stateAbbr];
  if (!stateFips) return null;
  const candidates = countiesByState.get(stateFips) ?? [];
  for (const county of candidates) {
    if (pointInGeometry(lng, lat, county.geometry)) return county.id;
  }
  return null;
}

function aggregateMetrosByState(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): Map<string, CountyAggregate> {
  const byState = new Map<string, { total: number; count: number; oppTotal: number; hvTotal: number }>();

  for (const f of metros.features) {
    if (f.properties.medianHomeValue <= 0) continue;
    const st = f.properties.state?.trim();
    if (!st || st.length > 2) continue;
    const value = getRawMetricFromFeature(f.properties, activeMetric);
    const entry = byState.get(st) ?? { total: 0, count: 0, oppTotal: 0, hvTotal: 0 };
    entry.total += value;
    entry.count += 1;
    entry.oppTotal += f.properties.opportunityScoreNormalized;
    entry.hvTotal += f.properties.medianHomeValue;
    byState.set(st, entry);
  }

  return new Map(
    Array.from(byState.entries()).map(([st, entry]) => [
      st,
      {
        value: entry.total / entry.count,
        count: entry.count,
        opportunityScore: entry.oppTotal / entry.count,
        medianHomeValue: entry.hvTotal / entry.count,
        hasDirectMetro: true,
      },
    ]),
  );
}

function aggregateMetrosByCounty(
  metros: DcMetroGeoJson,
  counties: RawCountyCollection,
  activeMetric: MetricLayerKey,
): Map<string, CountyAggregate> {
  const countiesByState = countiesByStateFips(counties);
  const byState = aggregateMetrosByState(metros, activeMetric);
  const byCounty = new Map<string, { total: number; count: number; oppTotal: number; hvTotal: number }>();

  for (const f of metros.features) {
    if (f.properties.medianHomeValue <= 0) continue;
    const lng = f.properties.labelLng;
    const lat = f.properties.labelLat;
    const stateAbbr = f.properties.state?.trim() ?? "";
    const countyFips = resolveCountyForMetro(lng, lat, stateAbbr, countiesByState);
    if (!countyFips) continue;

    const value = getRawMetricFromFeature(f.properties, activeMetric);
    const entry = byCounty.get(countyFips) ?? { total: 0, count: 0, oppTotal: 0, hvTotal: 0 };
    entry.total += value;
    entry.count += 1;
    entry.oppTotal += f.properties.opportunityScoreNormalized;
    entry.hvTotal += f.properties.medianHomeValue;
    byCounty.set(countyFips, entry);
  }

  const result = new Map<string, CountyAggregate>();

  for (const [fips, entry] of byCounty.entries()) {
    result.set(fips, {
      value: entry.total / entry.count,
      count: entry.count,
      opportunityScore: entry.oppTotal / entry.count,
      medianHomeValue: entry.hvTotal / entry.count,
      hasDirectMetro: true,
    });
  }

  for (const feature of counties.features) {
    const fips = feature.id;
    if (result.has(fips)) continue;
    const stateFips = feature.properties.stateFips ?? fips.slice(0, 2);
    const stateAbbr = STATE_FIPS_TO_ABBR[stateFips];
    const stateAgg = stateAbbr ? byState.get(stateAbbr) : undefined;
    if (stateAgg) {
      result.set(fips, { ...stateAgg, hasDirectMetro: false });
    }
  }

  return result;
}

function aggregateZipsByCounty(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): Map<string, CountyAggregate> {
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
        hasDirectMetro: true,
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
  stateAbbr = "",
): DcMetroFeature["properties"] {
  return {
    zipCode: regionId,
    neighborhoodName: name,
    state: stateAbbr,
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

export function loadUsCountiesGeoJson(): RawCountyCollection {
  return usCountiesGeoJson as unknown as RawCountyCollection;
}

export function loadSandboxCountiesGeoJson(): RawCountyCollection {
  return sandboxCountiesGeoJson as unknown as RawCountyCollection;
}

/** National county choropleth — metro centroid aggregation with state fallback. */
export function buildCountyChoroplethFromMetros(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): DcMetroGeoJson {
  const counties = loadUsCountiesGeoJson();
  const byCounty = aggregateMetrosByCounty(metros, counties, activeMetric);

  const features: DcMetroFeature[] = counties.features.map((feature) => {
    const fips = feature.id;
    const stateFips = feature.properties.stateFips ?? fips.slice(0, 2);
    const stateAbbr = STATE_FIPS_TO_ABBR[stateFips] ?? "";
    const name = COUNTY_FIPS_TO_NAME[fips] ?? feature.properties.name;
    const labelPoint = polygonLabelPoint(feature.geometry);
    const agg = byCounty.get(fips);

    const props = blankProperties(fips, name, labelPoint.lng, labelPoint.lat, stateAbbr);

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
      const stateFips = fips.slice(0, 2);
      const stateAbbr = STATE_FIPS_TO_ABBR[stateFips] ?? "";
      const name = COUNTY_FIPS_TO_NAME[fips] ?? feature.properties.name;
      const labelPoint = polygonLabelPoint(feature.geometry);
      const agg = byCounty.get(fips);

      const props = blankProperties(fips, name, labelPoint.lng, labelPoint.lat, stateAbbr);

      if (agg) {
        setAggregatedMetric(props, activeMetric, agg.value);
        props.medianHomeValue = agg.medianHomeValue;
        props.opportunityScore = agg.opportunityScore;
      }

      return { type: "Feature" as const, properties: props, geometry: feature.geometry };
    })
    .filter((f) => f.properties.medianHomeValue > 0);

  return {
    type: "FeatureCollection",
    metadata: metros.metadata,
    features,
  };
}

/**
 * County tab choropleth — national counties with metro/state proxy metrics,
 * overridden by shard-precision ZIP aggregation for sandbox counties.
 */
export function buildCountyChoropleth(
  metros: DcMetroGeoJson,
  sandboxShards: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): DcMetroGeoJson {
  const national = buildCountyChoroplethFromMetros(metros, activeMetric);
  const sandbox = buildCountyChoroplethFromShards(sandboxShards, activeMetric);
  const sandboxByFips = new Map(sandbox.features.map((f) => [f.properties.zipCode, f]));

  const features = national.features.map((feature) => {
    const override = sandboxByFips.get(feature.properties.zipCode);
    return override ?? feature;
  });

  const oppScores = features
    .filter((f) => f.properties.medianHomeValue > 0)
    .map((f) => f.properties.opportunityScore);
  const oppNormalized = normalizeScores(oppScores);
  let oppIndex = 0;
  for (const feature of features) {
    if (feature.properties.medianHomeValue <= 0) continue;
    feature.properties.opportunityScoreNormalized = oppNormalized[oppIndex++];
  }

  return {
    type: "FeatureCollection",
    metadata: metros.metadata,
    features,
  };
}
