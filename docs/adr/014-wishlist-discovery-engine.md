# ADR 014 — Wishlist Discovery Engine

**Status:** Accepted  
**Date:** 2026-07-12  
**Deciders:** Product (grill-me session)  
**Supersedes (partial):** E007 discovery journey scoring semantics (T043 hard filters)  
**Authority:** ADR-009 (UI shell), ADR-012 (data ingest), ADR-013 (sandbox scope)

## Context

E007 shipped a **Discovery criteria panel** and **hybrid scoring engine** (`packages/data/src/hybrid-scoring.ts`) that ranks sandbox ZIPs for cinematic flyover. User feedback and competitor benchmarking against **Where Might I Live** (wheremightilive.com) expose three structural gaps:

| Pain today | Root cause |
|------------|------------|
| Criteria feels like a no-op | `DEFAULT_DISCOVERY_CRITERIA` is permissive (walk ≥ 0, forecast ≥ −100); hard filters rarely bite |
| No partial matches | `evaluateFilters()` binary-excludes ZIPs; composite score is relative rank within survivors, not match-to-wishes |
| Metrics UX inferior | Flat "Add filter" list; no histogram sliders, per-wish heatmap/priority, compare chips, or ranked matches sidebar |

Current implementation:

- `DiscoveryCriteriaPanel.tsx` — sectionless filter rows with number inputs
- `rankNeighborhoods()` — hard filter → normalize within eligible → equal-weight composite (0–100)
- `DiscoveryAnalyticsPanel` — shows "hybrid score", not "% match" with per-wish breakdown
- `METRIC_LAYERS` — Reventure categories (Popular / Investor / Market Trends / Demographics / Hope-Core), not wish-browser categories

A grill-me session locked the **Wishlist Discovery** paradigm to reach WMIL parity without abandoning Cineborough's hope-core + investor differentiation.

## Decision

### 1. Wishes replace filters (mental model)

- User builds a **Wishlist** — an ordered set of **Wish cards**, not section-grouped filters.
- Each wish = one metric + target range + display controls.
- **+ Add a Wish** opens a **category browser** (see §5).
- Removing a wish does not change map layer; it only affects match scoring.
- Persisted key migrates: `cineborough:discovery-criteria` v2 → `cineborough:discovery-wishlist` v3 (adapter reads v2 on load).

### 2. Partial-match scoring (no hard exclusion)

Replace binary pass/fail with per-wish match scores and a composite **Match %**.

**Per-wish match** (0–100):

| Wish kind | 100% match | Decay |
|-----------|------------|-------|
| `range` [min, max] | value ∈ [min, max] | Linear decay to 0 at 2× band width beyond nearest bound |
| `min` | value ≥ min | Linear decay below min; 0 at min − band |
| `max` | value ≤ max | Linear decay above max; 0 at max + band |

`band` = `max(defaultSpan, |max − min|)` where `defaultSpan` comes from metric def (e.g. 10% of metro IQR at shard build, or static fallback in `wish-metrics.ts`).

**Wish status labels** (UI only):

| Match % | Label | Color |
|---------|-------|-------|
| ≥ 90 | Pass | green |
| 70–89 | Close | amber |
| < 70 | No match | muted red |

**Composite Match %**:

```
weight(w) = priority === "high" ? 2 : 1
matchPct(location) = round( Σ(wishMatch(w) × weight(w)) / Σ(weight(w)) )
```

- **All sandbox ZIPs are ranked** — no hard exclusion. Top N (default 10, flyover still top 3) returned sorted by Match %.
- Tie-break: higher best single wish match, then alphabetical ZIP.
- `RankedNeighborhood.score` becomes `matchPct`; `passedFilters` deprecated → `wishBreakdown[]`.

### 3. Wish card controls

Each active wish card exposes:

| Control | Behavior |
|---------|----------|
| **Range slider + histogram** | Dual-handle slider on metric distribution across active sandbox; histogram bins from shard values (20 bins, metro-relative) |
| **Heatmap** toggle | Sets map choropleth to this metric; legend shows wish range band overlay |
| **High Priority** toggle | Doubles weight in composite (§2) |
| **Just This** toggle | Sort matches by this wish only (ignores other wishes for ordering; composite still shown) |

Only one wish may have **Heatmap** active; activating one deactivates others. **Just This** is mutually exclusive for sort mode (last toggled wins).

### 4. Discovery results UX

| Surface | Behavior |
|---------|----------|
| **Matches list** (left sidebar in discovery mode) | Ranked ZIPs with Match %, heart favorite, click to select |
| **Compare chips** (top bar) | Up to 4 pinned locations with Match %; click to swap detail focus |
| **Match breakdown** (detail drawer) | Per-wish pass/close/no-match row + mini slider showing value vs wish band |
| **My Wishes vs All Data** tabs | *My Wishes*: breakdown + composite only; *All Data*: full `ZipDetailPanel` metric grid |

Flyover tour (E007) unchanged in trigger — still top 3 by Match % — but chip/list show full ranked set.

### 5. Metric taxonomy v2 (wish categories)

Reorganize discoverable metrics into WMIL-aligned **wish categories** while retaining hope-core + investor keys:

| Wish category | Example metrics | Notes |
|---------------|-----------------|-------|
| **Housing & Market** | Median Home Price, 1-Yr Forecast, Cap Rate, Days on Market, Seller Urgency | Renamed labels (see spec) |
| **Demographics** | Median Age, Population Growth, Remote Work % | ACS live |
| **Education** | College Degree Rate | ACS live; School Rating placeholder (T075) |
| **Environment** | Walkability / Park Score proxy | OSM today → park score proxy |
| **Health** | Physicians density | ACS B08124-derived (T075) |
| **Commute & Access** | Airport drive time proxy | OSRM/isochrone placeholder (T075) |
| **Investor Signals** | Overvaluation %, Market PSF, Home Value Growth | Kept for hybrid persona |

`METRIC_LAYERS` gains `wishCategory` field; sidebar choropleth categories remain for map exploration (ADR-009), but wish picker uses `wishCategory`.

**Label renames** (display only; keys unchanged):

| Key | Old label | New label |
|-----|-----------|-----------|
| `medianHomeValue` | Home Value | Median Home Price |
| `walkabilityScore` | Walkability Score | Park & Walk Score |
| `collegeDegreeRate` | College Degree Rate | Education Level |
| `sellerDesperationScore` | Seller Urgency | Seller Motivation |

Full mapping in `docs/specifications/wishlist-discovery.md` and `docs/schema/metrics-taxonomy.md` (v2 section, T074).

### 6. By Example mode (deferred within epic)

**By Example** — user pins 1–3 ZIPs they like; engine finds similar ZIPs by cosine similarity on normalized metric vector.

- Ship in T076 after partial-match core is stable
- Does not replace wishlist; complementary tab on criteria panel
- Sandbox-only; same 68 ZCTAs

### 7. Data model (TypeScript)

```typescript
interface DiscoveryWish {
  id: string;
  metric: WishMetricKey;
  min?: number;
  max?: number;
  priority: "normal" | "high";
  heatmapActive: boolean;
}

interface DiscoveryWishlist {
  wishes: DiscoveryWish[];
  sortMode: "composite" | "single";
  sortWishId?: string;
  favorites: string[]; // zip codes
}

interface WishMatchBreakdown {
  wishId: string;
  metric: WishMetricKey;
  matchPct: number;
  status: "pass" | "close" | "no-match";
  actual: number;
  targetMin?: number;
  targetMax?: number;
}
```

Live in `packages/data/src/wishlist-scoring.ts` (new); `hybrid-scoring.ts` re-exports with deprecation shim for one sprint.

### 8. Scope constraints (unchanged)

- Sandbox metros only (ADR-013): DC, Orlando, SF Bay, San Jose
- No live school ratings or Walk Score API — proxies and placeholders per ADR-012
- National geography (ADR-010) shows guidance chip until sandbox drill-in
- Phase 2b cinematic (ADR-008) unaffected

## Consequences

### Positive

- Partial matches become first-class — users see 87% / 94% / 98% matches like WMIL
- Wish cards align mental model with lifestyle discovery, not spreadsheet filtering
- Per-wish heatmap ties criteria to map exploration (fixes "criteria no-op" perception)
- Compare + favorites support multi-neighborhood decision workflow
- Taxonomy v2 cleaner labels improve non-investor comprehension

### Negative / trade-offs

- Scoring refactor touches `CinematicDiscovery`, storage, analytics panel, and tests
- Histogram requires per-shard value arrays at UI open (memoized; ~68 features — negligible)
- New placeholder metrics (school, airport, physicians) need schema + ingest tickets before full WMIL parity
- "Just This" + heatmap toggles add state complexity; must persist in wishlist v3
- Relative rank within cohort (old composite) ≠ absolute match % — users may need onboarding tooltip

## Non-goals

- Nationwide wishlist discovery (requires ADR-013 amendment + ingest scale)
- Live GreatSchools / Walk Score / crime index APIs (paid gates)
- Replacing Opportunity Index choropleth default
- Property-level wish matching (Phase 3 / ADR-009 Level 3)

## Implementation order

1. **T066** — `wishlist-scoring.ts` partial-match engine + tests
2. **T067** — Wishlist types + storage v3 migration
3. **T074** — Metric taxonomy v2 labels + `wishCategory` (unblocks picker)
4. **T068** — Wish card UI + histogram slider component
5. **T069** — Add Wish category browser
6. **T070** — Priority / heatmap / Just This toggles wired to map layer
7. **T073** — Matches ranked list + favorites
8. **T071** — Match breakdown + My Wishes / All Data tabs
9. **T072** — Compare location chips
10. **T075** — New metric candidates (park proxy, airport, school placeholder, physicians)
11. **T076** — By Example similarity mode

## References

- [`docs/specifications/wishlist-discovery.md`](../specifications/wishlist-discovery.md)
- [`docs/schema/metrics-taxonomy.md`](../schema/metrics-taxonomy.md)
- Epic [E008](../../beads/epics/E008-wishlist-discovery.md), Sprint [S014](../../beads/sprints/S014-wishlist-discovery/sprint.md)
- ADR-009 grill-me pattern, E007 `hybrid-scoring.ts`, `DiscoveryCriteriaPanel.tsx`
- Competitor: [Where Might I Live](https://wheremightilive.com)
