import type { DcMetroGeoJson } from "@cineborough/data";
import { METRO_SHARD_SOURCES } from "@cineborough/data";

export type SearchResultKind = "metro" | "zip";

export interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  kind: SearchResultKind;
  lng: number;
  lat: number;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function buildSearchIndex(usMetros: DcMetroGeoJson): SearchResult[] {
  const results: SearchResult[] = [];

  for (const feature of usMetros.features) {
    const { zipCode, neighborhoodName, state, labelLng, labelLat, medianHomeValue } =
      feature.properties;
    if (medianHomeValue <= 0) continue;

    results.push({
      id: zipCode,
      label: neighborhoodName,
      sublabel: `Metro · ${state} · CBSA ${zipCode}`,
      kind: "metro",
      lng: labelLng,
      lat: labelLat,
    });
  }

  for (const [cbsa, shard] of Object.entries(METRO_SHARD_SOURCES)) {
    for (const feature of shard.features) {
      const { zipCode, neighborhoodName, state, labelLng, labelLat } = feature.properties;
      results.push({
        id: zipCode,
        label: zipCode,
        sublabel: `${neighborhoodName} · ${state} · ${shard.metadata.metro}`,
        kind: "zip",
        lng: labelLng,
        lat: labelLat,
      });
    }
    void cbsa;
  }

  return results;
}

export function searchLocations(
  query: string,
  index: SearchResult[],
  limit = 8,
): SearchResult[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  const scored: { result: SearchResult; score: number }[] = [];

  for (const result of index) {
    const label = result.label.toLowerCase();
    const sub = result.sublabel.toLowerCase();
    const id = result.id.toLowerCase();

    let score = 0;
    if (id === q || label === q) score = 100;
    else if (id.startsWith(q)) score = 90;
    else if (label.startsWith(q)) score = 80;
    else if (id.includes(q)) score = 70;
    else if (label.includes(q)) score = 60;
    else if (sub.includes(q)) score = 40;

    if (score > 0) scored.push({ result, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.result.label.localeCompare(b.result.label))
    .slice(0, limit)
    .map((s) => s.result);
}
