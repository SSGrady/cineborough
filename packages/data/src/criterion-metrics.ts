import type { DiscoveryFilterMetric } from "./hybrid-scoring";
import { DISCOVERY_FILTER_METRICS } from "./hybrid-scoring";
import type { CriterionCategory } from "./types";
import { METRIC_LAYERS } from "./types";

export type { CriterionCategory };

export interface CriterionCategoryDef {
  id: CriterionCategory;
  label: string;
  metrics: DiscoveryFilterMetric[];
}

export const CRITERION_CATEGORIES: CriterionCategoryDef[] = [
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
    metrics: ["collegeDegreeRate", "schoolRatingPlaceholder"],
  },
  {
    id: "environment",
    label: "Environment",
    metrics: ["walkabilityScore", "parkScoreProxy"],
  },
  {
    id: "health",
    label: "Health",
    metrics: ["physiciansPer10k"],
  },
  {
    id: "commute-access",
    label: "Commute & Access",
    metrics: ["airportDriveMin"],
  },
  {
    id: "investor-signals",
    label: "Investor Signals",
    metrics: ["overvaluationPct", "marketPsf"],
  },
];

const METRIC_TO_CATEGORY = new Map<DiscoveryFilterMetric, CriterionCategory>();
for (const layer of METRIC_LAYERS) {
  if (layer.criterionCategory && layer.key !== "opportunityScore") {
    METRIC_TO_CATEGORY.set(layer.key as DiscoveryFilterMetric, layer.criterionCategory);
  }
}

export function criterionCategoryForMetric(metric: DiscoveryFilterMetric): CriterionCategory | undefined {
  return METRIC_TO_CATEGORY.get(metric);
}

export function metricsForCriterionCategory(category: CriterionCategory): DiscoveryFilterMetric[] {
  return CRITERION_CATEGORIES.find((c) => c.id === category)?.metrics ?? [];
}

/** All discoverable criterion metrics (flat list). */
export const ALL_CRITERION_METRICS: DiscoveryFilterMetric[] = DISCOVERY_FILTER_METRICS;
