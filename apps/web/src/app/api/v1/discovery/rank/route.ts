import { NextResponse } from "next/server";
import {
  DEFAULT_DISCOVERY_CRITERIA,
  type DiscoveryCriteria,
  type DiscoveryFilterMetric,
  METRIC_LAYERS,
} from "@cineborough/data";
import {
  DEFAULT_NATIONAL_DISCOVERY_TOP_N,
  rankMetroNeighborhoods,
  rankNationwideNeighborhoods,
} from "@/lib/server/nationwide-discovery-rank";

const CBSA_PATTERN = /^\d{5}$/;

const ALLOWED_METRICS = new Set(
  METRIC_LAYERS.map((layer) => layer.key).filter(
    (key) => key !== "opportunityScore" && key !== "incomeGrowthRate",
  ),
);

function isDiscoveryCriteria(value: unknown): value is DiscoveryCriteria {
  if (!value || typeof value !== "object") return false;
  const filters = (value as DiscoveryCriteria).filters;
  if (!Array.isArray(filters)) return false;
  return filters.every(
    (filter) =>
      typeof filter.id === "string" &&
      typeof filter.metric === "string" &&
      ALLOWED_METRICS.has(filter.metric as DiscoveryFilterMetric),
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { criteria, topN, cbsaCode, scope } = body as {
    criteria?: DiscoveryCriteria;
    topN?: number;
    cbsaCode?: string;
    scope?: "national" | "metro";
  };

  const resolvedCriteria = isDiscoveryCriteria(criteria)
    ? criteria
    : DEFAULT_DISCOVERY_CRITERIA;

  if (resolvedCriteria.filters.length === 0) {
    return NextResponse.json(
      { error: "At least one criterion is required" },
      { status: 400 },
    );
  }

  const limit =
    typeof topN === "number" && topN > 0 && topN <= 200
      ? Math.floor(topN)
      : DEFAULT_NATIONAL_DISCOVERY_TOP_N;

  const metroScope =
    scope === "metro" || (typeof cbsaCode === "string" && CBSA_PATTERN.test(cbsaCode));

  const result = metroScope && typeof cbsaCode === "string" && CBSA_PATTERN.test(cbsaCode)
    ? rankMetroNeighborhoods(cbsaCode, resolvedCriteria, { topN: limit })
    : rankNationwideNeighborhoods(resolvedCriteria, { topN: limit });

  return NextResponse.json(
    {
      ...result,
      scope: metroScope ? "metro" : "national",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
