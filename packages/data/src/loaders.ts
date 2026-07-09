import type { ZipMetrics, ZipMetricsCollection } from "./types";
import { computeOpportunityScore, enrichWithOpportunityScores } from "./opportunity-index";
import { validateZipMetricsCollection, type ZipMetricsInput } from "./validation";
import {
  loadDcMetroGeoJson,
  zipMetricsCollectionFromGeoJson,
} from "./dc-metro-geojson";

import mockData from "../../../data/mock/zip-metrics.json";

function enrichZip(zip: ZipMetricsInput): ZipMetrics {
  const opportunityScore = computeOpportunityScore(zip);
  return { ...zip, opportunityScore };
}

/** @deprecated Prefer loadDcMetroGeoJson() — kept for tests and build inputs */
export function loadMockZipMetrics(): ZipMetricsCollection {
  const validated = validateZipMetricsCollection(mockData);
  const zips = validated.zips.map(enrichZip);
  const withNormalized = enrichWithOpportunityScores(zips);

  return {
    metro: validated.metro,
    updatedAt: validated.updatedAt,
    zips: withNormalized,
  };
}

/** Primary loader — unified GeoJSON with precomputed choropleth fields */
export function loadDcMetroData(): ZipMetricsCollection {
  return zipMetricsCollectionFromGeoJson(loadDcMetroGeoJson());
}

export function getZipByCode(zipCode: string): ZipMetrics | undefined {
  return loadDcMetroData().zips.find((z) => z.zip === zipCode);
}
