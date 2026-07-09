# Beads Changelog

Aggregated progress log for Cineborough development.

---

## 2026-07-08

### Scaffold Complete

- Created repo structure: AGENTS.md, 8 ADRs, docs/schema, beads hierarchy
- Seeded Epic E001 (MVP DC Metro Discovery Map) and Sprint S001 (Phase 1 Data Engine)
- Created 5 starter tickets (T001–T005)
- Added mock data for 5 DC-area ZIPs
- Next.js + Deck.gl + Mapbox skeleton in `apps/web`

**Status:** T001 (repo scaffold) → `done`. Remaining tickets → `open`.

### T002 — Mock Data Loader

- Added `packages/data/src/validation.ts` with type guards for investor/hope-core metrics
- `loadMockZipMetrics()` validates all 5 sandbox ZIPs on load
- Verified mock JSON matches `docs/schema/metrics-taxonomy.md`

**Status:** T002 → `done`.

### T003 — Opportunity Index

- Verified formula: `homePriceForecast1yr + remoteWorkPct − overvaluationPct`
- Added `enrichWithOpportunityScores` alias and example exports
- Documented raw scores match 22201 (32.4), 22204 (23.6), 20001 (22.7)

**Status:** T003 → `done`.

### T004 — Choropleth Map

- MapView with Mapbox dark-v11 + Deck.gl GeoJsonLayer
- Mock ZIP boundaries GeoJSON for 5 sandbox ZIPs
- Color legend and Level 2 flyTo on ZIP click

**Status:** T004 → `done`.

### T005 — Sidebar & Zip Detail Panel

- Reventure-style sidebar with Popular / Investor / Hope-Core groups
- Metric layer toggle re-colors choropleth
- ZipDetailPanel shows Forecast & Valuation + Demographics on ZIP select

**Status:** T005 → `done`. Sprint S001 complete (5/5).

### Phase 2 Kickoff — Epic E002 / Sprint S002

- Created Epic E002 (Cinematic UX) and Sprint S002 with tickets T006–T010
- E001 marked complete; PLAN.md updated to Phase 2 current
- Google 3D Photorealistic Tiles deferred to post-S002 ticket

**Status:** S002 opened. T006–T010 → `open`.

### T006 — Scroll Layout Shell

- `CinematicDiscovery` with GSAP ScrollTrigger sections over fixed map backdrop

**Status:** T006 → `done`.

### T007 — Locale Quote Card

- `LocaleQuoteCard` with blurred gradient background for 22201

**Status:** T007 → `done`.

### T008 — Map Camera Transitions

- `CINEMATIC_CAMERAS` presets; scroll sections drive flyTo with pitch/bearing

**Status:** T008 → `done`.

### T009 — Route Path Overlay

- Deck.gl PathLayer for mock Arlington Orange Line corridor

**Status:** T009 → `done`.

### T010 — ZCTA Boundaries

- Census TIGER/Line 2020 ZCTA shapes replace approximate squares

**Status:** T010 → `done`. Sprint S002 complete (5/5).
