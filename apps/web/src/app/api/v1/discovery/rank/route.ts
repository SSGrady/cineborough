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
  type ViewportBounds,
} from "@/lib/server/nationwide-discovery-rank";
import { criteriaHash } from "@/lib/reactive-discovery";

const CBSA_PATTERN = /^\d{5}$/;

const ALLOWED_METRICS = new Set(
  METRIC_LAYERS.map((layer) => layer.key).filter(
    (key) => key !== "opportunityScore" && key !== "incomeGrowthRate",
  ),
);

const RANK_CACHE_TTL_MS = 30_000;
const rankCache = new Map<string, { expires: number; payload: Record<string, unknown> }>();

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

function isViewportBounds(value: unknown): value is ViewportBounds {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [sw, ne] = value;
  if (!Array.isArray(sw) || !Array.isArray(ne) || sw.length !== 2 || ne.length !== 2) {
    return false;
  }
  return sw.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    ne.every((n) => typeof n === "number" && Number.isFinite(n));
}

function rankCacheKey(
  criteria: DiscoveryCriteria,
  limit: number,
  cbsaCode: string | undefined,
  scope: "national" | "metro",
  viewportBounds?: ViewportBounds,
): string {
  return JSON.stringify({
    hash: criteriaHash(criteria),
    limit,
    cbsaCode: cbsaCode ?? null,
    scope,
    viewportBounds: viewportBounds ?? null,
  });
}

function pruneRankCache(now: number): void {
  if (rankCache.size < 64) return;
  for (const [key, entry] of rankCache) {
    if (entry.expires <= now) {
      rankCache.delete(key);
    }
  }
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

  const { criteria, topN, cbsaCode, scope, viewportBounds } = body as {
    criteria?: DiscoveryCriteria;
    topN?: number;
    cbsaCode?: string;
    scope?: "national" | "metro";
    viewportBounds?: unknown;
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

  const bounds = isViewportBounds(viewportBounds) ? viewportBounds : undefined;

  const cacheKey = rankCacheKey(
    resolvedCriteria,
    limit,
    typeof cbsaCode === "string" ? cbsaCode : undefined,
    metroScope ? "metro" : "national",
    bounds,
  );

  const now = Date.now();
  pruneRankCache(now);
  const cached = rankCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "no-store", "X-Rank-Cache": "HIT" },
    });
  }

  const result =
    metroScope && typeof cbsaCode === "string" && CBSA_PATTERN.test(cbsaCode)
      ? rankMetroNeighborhoods(cbsaCode, resolvedCriteria, { topN: limit })
      : rankNationwideNeighborhoods(resolvedCriteria, {
          topN: limit,
          viewportBounds: bounds,
        });

  const payload = {
    ...result,
    scope: metroScope ? "metro" : "national",
  };

  rankCache.set(cacheKey, { expires: now + RANK_CACHE_TTL_MS, payload });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store", "X-Rank-Cache": "MISS" },
  });
}
