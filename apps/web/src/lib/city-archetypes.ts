import type { DiscoveryCriteria } from "@cineborough/data";

export interface CityArchetype {
  id: string;
  label: string;
  description: string;
  criteria: DiscoveryCriteria;
}

/** Pre-configured city profiles for By Example reactive matching. */
export const CITY_ARCHETYPES: CityArchetype[] = [
  {
    id: "walkable-urban",
    label: "Walkable urban core",
    description: "SF-style livability — high walk score, moderate home prices.",
    criteria: {
      filters: [
        { id: "arch-walk", metric: "walkabilityScore", min: 70, max: 100, priority: true },
        { id: "arch-price", metric: "medianHomeValue", min: 400_000, max: 950_000 },
      ],
    },
  },
  {
    id: "growth-market",
    label: "Austin-style growth",
    description: "Strong 1-yr forecast with solid cap rate upside.",
    criteria: {
      filters: [
        { id: "arch-forecast", metric: "homePriceForecast1yr", min: 1.5, max: 5, priority: true },
        { id: "arch-cap", metric: "capRate", min: 4, max: 8 },
      ],
    },
  },
  {
    id: "value-investor",
    label: "Value investor",
    description: "Below-median prices with seller motivation signals.",
    criteria: {
      filters: [
        { id: "arch-value", metric: "medianHomeValue", min: 200_000, max: 450_000, priority: true },
        { id: "arch-desperation", metric: "sellerDesperationScore", min: 55, max: 100 },
      ],
    },
  },
  {
    id: "family-suburb",
    label: "Family suburb",
    description: "School placeholder + park proxy for suburban livability.",
    criteria: {
      filters: [
        { id: "arch-school", metric: "schoolRatingPlaceholder", min: 6, max: 10, priority: true },
        { id: "arch-park", metric: "parkScoreProxy", min: 50, max: 100 },
      ],
    },
  },
];
