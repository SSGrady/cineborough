import usStatesGeoJson from "../../../data/boundaries/us-states.geojson";
import type { DcMetroFeature, DcMetroGeoJson, MetricLayerKey, MetroGeometry, DcMetroFeatureProperties } from "./types";
import { getRawMetricFromFeature } from "./dc-metro-geojson";
import { normalizeScores } from "./opportunity-index";

interface RawStateFeature {
  type: "Feature";
  id: string;
  properties: { name: string; density?: number };
  geometry: MetroGeometry;
}

interface RawStateCollection {
  type: "FeatureCollection";
  features: RawStateFeature[];
}

/** FIPS id → USPS abbreviation */
export const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

export const STATE_ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_FIPS_TO_ABBR).map(([fips, abbr]) => {
    const feature = (usStatesGeoJson as unknown as RawStateCollection).features.find(
      (f) => f.id === fips,
    );
    return [abbr, feature?.properties.name ?? abbr];
  }),
);

/** Continental lower-48 + DC — exclude AK (02), HI (15) for national choropleth */
export const CONTINENTAL_STATE_FIPS = new Set(
  Object.keys(STATE_FIPS_TO_ABBR).filter((fips) => fips !== "02" && fips !== "15"),
);

function polygonCentroid(geometry: MetroGeometry): { lng: number; lat: number } {
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0]?.[0];
  if (!ring || ring.length === 0) return { lng: -96.5, lat: 39.2 };
  let sumLng = 0;
  let sumLat = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return { lng: sumLng / n, lat: sumLat / n };
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function aggregateMetrosByState(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): Map<string, { value: number; count: number; opportunityScore: number }> {
  const byState = new Map<string, { total: number; count: number; oppTotal: number }>();

  for (const f of metros.features) {
    if (f.properties.medianHomeValue <= 0) continue;
    const st = f.properties.state?.trim();
    if (!st || st.length > 2) continue;
    const value = getRawMetricFromFeature(f.properties, activeMetric);
    const entry = byState.get(st) ?? { total: 0, count: 0, oppTotal: 0 };
    entry.total += value;
    entry.count += 1;
    entry.oppTotal += f.properties.opportunityScoreNormalized;
    byState.set(st, entry);
  }

  return new Map(
    Array.from(byState.entries()).map(([st, entry]) => [
      st,
      {
        value: entry.total / entry.count,
        count: entry.count,
        opportunityScore: entry.oppTotal / entry.count,
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
    state: regionId.length === 2 ? regionId : "",
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

export function loadUsStatesGeoJson(): RawStateCollection {
  return usStatesGeoJson as unknown as RawStateCollection;
}

/** State-level choropleth — aggregates metro CBSA metrics by USPS state code. */
export function buildStateChoroplethFromMetros(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): DcMetroGeoJson {
  const states = loadUsStatesGeoJson();
  const byState = aggregateMetrosByState(metros, activeMetric);

  const metricValues = Array.from(byState.values()).map((v) => v.value);
  const normalized = normalizeScores(metricValues);
  const stateAbbrs = Array.from(byState.keys());

  const features: DcMetroFeature[] = states.features
    .filter((f) => CONTINENTAL_STATE_FIPS.has(f.id))
    .map((feature) => {
      const abbr = STATE_FIPS_TO_ABBR[feature.id] ?? feature.id;
      const name = feature.properties.name;
      const centroid = polygonCentroid(feature.geometry);
      const aggIndex = stateAbbrs.indexOf(abbr);
      const agg = byState.get(abbr);

      const props = blankProperties(abbr, name, centroid.lng, centroid.lat);

      if (agg) {
        const norm = normalized[aggIndex] ?? 0;
        setAggregatedMetric(props, activeMetric, agg.value);
        props.opportunityScore = agg.opportunityScore;
        props.opportunityScoreNormalized = norm;
      }

      return { type: "Feature", properties: props, geometry: feature.geometry };
    });

  return {
    type: "FeatureCollection",
    metadata: metros.metadata,
    features,
  };
}

/** National view — continental state shapes, uniform national aggregate fill. */
export function buildNationalChoroplethFromMetros(
  metros: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): DcMetroGeoJson {
  const states = loadUsStatesGeoJson();
  const oppValues = metros.features
    .filter((f) => f.properties.medianHomeValue > 0)
    .map((f) => f.properties.opportunityScoreNormalized);
  const oppAvg =
    oppValues.length > 0 ? oppValues.reduce((s, v) => s + v, 0) / oppValues.length : 0;

  const rawMetrics = metros.features
    .filter((f) => f.properties.medianHomeValue > 0)
    .map((f) => getRawMetricFromFeature(f.properties, activeMetric));
  const nationalAvg =
    rawMetrics.length > 0 ? rawMetrics.reduce((s, v) => s + v, 0) / rawMetrics.length : 0;
  const nationalNorm =
    rawMetrics.length > 0
      ? normalizeScores([...rawMetrics, nationalAvg]).at(-1) ?? 50
      : 50;

  const props = blankProperties("US", "United States", -96.5, 39.2);
  props.medianHomeValue = activeMetric === "medianHomeValue" ? nationalAvg : props.medianHomeValue;
  setAggregatedMetric(props, activeMetric, nationalAvg);
  props.opportunityScore = oppAvg;
  props.opportunityScoreNormalized = nationalNorm;

  const features: DcMetroFeature[] = states.features
    .filter((f) => CONTINENTAL_STATE_FIPS.has(f.id))
    .map((feature) => ({
      type: "Feature" as const,
      properties: {
        ...props,
        zipCode: `US-${feature.id}`,
        neighborhoodName: "United States",
        labelLng: props.labelLng,
        labelLat: props.labelLat,
      },
      geometry: feature.geometry,
    }));

  return {
    type: "FeatureCollection",
    metadata: metros.metadata,
    features,
  };
}
