import type { DiscoveryFilterMetric } from "./hybrid-scoring";
import { DISCOVERY_FILTER_METRICS } from "./hybrid-scoring";
import type { WishCategory } from "./types";
import { METRIC_LAYERS } from "./types";

export type { WishCategory };

export interface WishCategoryDef {
  id: WishCategory;
  label: string;
  metrics: DiscoveryFilterMetric[];
}

export const WISH_CATEGORIES: WishCategoryDef[] = [
  {
    id: "housing-market",
    label: "Housing & Market",
    metrics: [
      "medianHomeValue",
      "homePriceForecast1yr",
      "capRate",
      "daysOnMarket",
      "sellerDesperationScore",
      "homeValueGrowthYoy",
    ],
  },
  {
    id: "demographics",
    label: "Demographics",
    metrics: ["medianAge", "populationGrowthRate", "remoteWorkPct"],
  },
  {
    id: "education",
    label: "Education",
    metrics: ["collegeDegreeRate"],
  },
  {
    id: "environment",
    label: "Environment",
    metrics: ["walkabilityScore"],
  },
  {
    id: "health",
    label: "Health",
    metrics: [],
  },
  {
    id: "commute-access",
    label: "Commute & Access",
    metrics: [],
  },
  {
    id: "investor-signals",
    label: "Investor Signals",
    metrics: ["overvaluationPct", "marketPsf"],
  },
];

const METRIC_TO_CATEGORY = new Map<DiscoveryFilterMetric, WishCategory>();
for (const layer of METRIC_LAYERS) {
  if (layer.wishCategory && layer.key !== "opportunityScore") {
    METRIC_TO_CATEGORY.set(layer.key as DiscoveryFilterMetric, layer.wishCategory);
  }
}

export function wishCategoryForMetric(metric: DiscoveryFilterMetric): WishCategory | undefined {
  return METRIC_TO_CATEGORY.get(metric);
}

export function metricsForWishCategory(category: WishCategory): DiscoveryFilterMetric[] {
  return WISH_CATEGORIES.find((c) => c.id === category)?.metrics ?? [];
}

/** All discoverable wish metrics (flat list). */
export const ALL_WISH_METRICS: DiscoveryFilterMetric[] = DISCOVERY_FILTER_METRICS;
