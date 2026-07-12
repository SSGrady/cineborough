# ADR 015 — Discovery Moat Strategy

**Status:** Accepted  
**Date:** 2026-07-12  
**Deciders:** Product (grill-me session, Part 1 + Part 2)  
**Builds on:** ADR-014 (wishlist/criteria scoring), ADR-008 (cinematic UX), ADR-005 (Opportunity Index)  
**Authority:** ADR-009 (UI shell), ADR-013 (sandbox scope), `docs/specifications/discovery-criteria-ux-v2.md`

## Context

S014 shipped a **hybrid discovery shell** (T077): three-pane layout, criterion cards, partial Match %, and Cineborough-native vocabulary. WMIL parity is **partial** — several interaction patterns remain stubbed or missing, and Cineborough's differentiation (hope-core + investor tension, cinematic storytelling, productized indices) is not yet productized as a moat.

### Part 1 — WMIL gaps still open

| Gap | Current state | Target |
|-----|---------------|--------|
| Interactive fly-to matches sidebar | `MatchesList` flat ranked list; no state/metro grouping; click selects but no pitched flyTo | Right rail grouped by state; Match % badges; click → `flyTo` ZIP or metro context |
| Histogram/bar sliders with distribution | `CriterionRangeSlider` / `WishRangeSlider` exist with 20-bin histograms | Full WMIL parity: bar chart under dual handles, live band overlay on choropleth |
| Priority toggles | T070 open — no Heatmap / High Priority / Just This on criterion cards | Per-criterion controls wired to scoring + map layer |
| Deep-dive split panel | `ZipDetailPanel` only; no hero image, no Criteria vs All Data tabs, no embedded media | Split panel: photo hero, tabbed breakdown, provenance + links |
| "Wish" terminology | T077 renamed UI; legacy `Wish*` files and ADR-014 docs remain internal | Zero "wish" in user-facing copy; internal migration path documented |

### Part 2 — Cineborough moat (differentiation)

| Moat | Why it matters | WMIL has this? |
|------|----------------|----------------|
| **Investor ↔ Hope-Core tension slider** | Surfaces the product thesis — ROI *and* livability — as an explorable quadrant, not a hidden composite | No |
| **Cinematic micro-storytelling on select** | GSAP camera + locale vibe quotes on map turn data points into place-feel | Partial (static quotes in scroll mode) |
| **Productized Opportunity Index + custom formula builder** | Users compose indices ("Digital Nomad Yield Index") and see them on map + in match ranking | No |

ADR-014 established *scoring semantics*; ADR-015 establishes *competitive strategy*: close WMIL interaction gaps in Phase 1, then layer moat features that WMIL cannot replicate without abandoning its lifestyle-only positioning.

## Decision

### 1. Two-track delivery under Epic E009

| Track | Goal | Phase |
|-------|------|-------|
| **WMIL parity** | Close remaining interaction gaps (T078–T082, T088) | Phase 1 — S015 MVP |
| **Cineborough moat** | Tension slider, micro-storytelling, custom indices (T083–T087) | Phase 2 — S015 v2 / follow-on sprint |

S014 tickets T066/T067 (scoring engine + storage) remain prerequisites; S015 assumes partial-match scoring is canonical via `wishlist-scoring.ts` or `hybrid-scoring.ts` with deprecation shim.

### 2. WMIL parity requirements (Phase 1)

#### 2a. State-grouped fly-to matches sidebar

- Right rail `MatchesList` groups sandbox ZIPs by **state** (VA, MD, DC, FL, CA) with collapsible sections.
- Each row: favorite heart, ZIP + neighborhood label, **Match % badge** (hero styling per `discovery-criteria-ux-v2.md`).
- Click row → `MapView.flyTo` ZIP centroid with discovery pitch/bearing preset; updates compare chip focus.
- Metro context chip updates when selection crosses CBSA boundary.

#### 2b. Histogram distribution sliders

- Criterion cards show **20-bin bar histogram** under dual-handle range slider.
- Histogram computed from active sandbox shard values (memoized per metric).
- Active criterion band overlays on choropleth when Heatmap toggle active (T080).

#### 2c. Priority toggles (per criterion card)

| Toggle | Behavior |
|--------|----------|
| **Heatmap** | Sets map choropleth to this metric; one active at a time; legend shows criterion band |
| **High Priority** | Doubles weight in composite Match % |
| **Just This** | Re-sorts matches by single criterion match (composite still displayed) |

State persists in `cineborough:discovery-criteria` storage v3.

#### 2d. Deep-dive split panel

On location select in discovery mode:

- **Left pane:** neighborhood photo hero (T064 asset pipeline), locale quote snippet, embedded map links (Google Maps / Walk Score proxy).
- **Tabs:** **My Criteria** (composite Match %, per-criterion pass/close/no-match, mini band sliders) vs **All Data** (full `ZipDetailPanel` investor + hope-core blocks with provenance).
- Replaces stacked drawer pattern for discovery shell only.

#### 2e. Terminology discipline

- User-facing: **criterion / criteria**, **match factors**, **Match %** — never "wish".
- Internal code may retain `DiscoveryWish` types until T067 migration completes; ADR-014 "wishlist" language is historical in specs only.
- T082 adds copy audit + optional ESLint/string-lint guard for discovery components.

### 3. Cineborough moat requirements (Phase 2)

#### 3a. Investor ↔ Hope-Core tension slider

- Dual-ended slider (0 = pure investor, 100 = pure hope-core) reweights criterion defaults and composite formula emphasis.
- **Quadrant overlay** on map: scatter or choropleth blend showing ZIP position in investor-yield vs livability space.
- Default position: 50 (balanced hybrid persona per ADR-001).

#### 3b. Cinematic micro-storytelling on location select

- On matches-list or compare-chip select: short GSAP camera path (pitch 45°, eased flyTo) + `LocaleQuoteCard` anchored to map.
- Distinct from full scroll tour (E007) — **micro** = 2–3s transition, one quote, optional amenity POI pulse.
- Reuses E002 assets: `CINEMATIC_CAMERAS`, `sandbox-amenities.geojson`, locale quotes per ZIP.

#### 3c. Productized Opportunity Index + custom formula builder

- **Built-in indices:** Opportunity Index (ADR-005), presets documented in `docs/schema/opportunity-index.md`.
- **Custom index builder:** user selects 2–5 metrics, assigns signed weights, names index (e.g. "Digital Nomad Yield Index").
- Custom index becomes: (a) choropleth layer option, (b) optional sort key in discovery, (c) persisted user profile.
- Formula validation: metrics must exist in `docs/schema/metrics-taxonomy.md`; weights ∈ [−2, +2]; normalize to 0–100 for display.

Schema:

```typescript
interface CustomIndex {
  id: string;
  name: string;
  terms: Array<{ metric: MetricKey; weight: number }>;
  normalize: "minmax" | "zscore";
}
```

### 4. Scope constraints (unchanged)

- Sandbox metros only (ADR-013): 68 ZCTAs across DC, Orlando, SF Bay, San Jose
- No live GreatSchools / Walk Score / crime APIs
- Google 3D Photorealistic Tiles remain behind ADR-008 flag
- National geography shows guidance chip until sandbox drill-in

### 5. Relationship to E008 / S014

| S014 ticket | Disposition |
|-------------|-------------|
| T066, T067 | Prerequisite — scoring + storage before S015 toggles |
| T070 | Superseded in planning by **T080** (same scope, criteria vocabulary) |
| T071 | Superseded by **T081** (deep-dive split panel includes tabs) |
| T072 | Carried to **T088** |
| T075 | Carried to **T089** |
| T076 | Carried to **T090** |
| T077 | Done — terminology foundation |

E008 remains open until S014 scoring tickets close; E009 starts when S014 shell is stable (T068/T069/T073/T077 done).

## Consequences

### Positive

- WMIL users get familiar interaction patterns without Cineborough becoming a clone
- Moat features are defensible — investor + hope-core tension is brand-native
- Custom indices create engagement loop (users invest in their formula, return to refine)
- Micro-storytelling bridges Phase 1 data engine and Phase 2 cinematic north star

### Negative / trade-offs

- Two-track delivery increases sprint surface area; moat features depend on WMIL parity shell
- Custom index builder adds schema + validation complexity; must not fork metric definitions
- Tension slider + quadrant overlay may confuse users without onboarding tooltip
- State-grouped sidebar adds layout complexity for multi-state sandboxes (4 metros, 3 states + DC)

## Non-goals

- Nationwide discovery moat (requires ingest scale beyond ADR-013)
- Live property-level custom indices (Phase 3)
- Replacing default Opportunity Index choropleth as landing layer
- Full GSAP scroll scrollytelling (ADR-008 Phase 2b remains separate)

## Implementation order

See `docs/specifications/discovery-moat-roadmap.md` for phased delivery.

**Phase 1 (WMIL parity close-out):**

1. T066/T067 — scoring + storage (S014 carry)
2. T080 — priority toggles
3. T078 — fly-to matches sidebar
4. T081 — deep-dive split panel
5. T079 — histogram polish
6. T088 — compare chips pin-from-map
7. T082 — terminology audit

**Phase 2 (moat):**

8. T083 — tension slider + quadrant
9. T084 — micro-storytelling
10. T085 → T086 → T087 — custom index stack

**Stretch:**

11. T089 — new criterion metrics
12. T090 — By Example similarity

## References

- [`docs/specifications/discovery-moat-roadmap.md`](../specifications/discovery-moat-roadmap.md)
- [`docs/specifications/discovery-criteria-ux-v2.md`](../specifications/discovery-criteria-ux-v2.md)
- ADR-014, ADR-008, ADR-005
- Epic [E009](../../beads/epics/E009-discovery-moat-match-engine.md), Sprint [S015](../../beads/sprints/S015-discovery-moat/sprint.md)
- Competitor: [Where Might I Live](https://wheremightilive.com)
