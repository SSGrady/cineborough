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

### E003 / S003 — Reventure-Light UX Refactor

- ADR-009 + `docs/schema/deck-gl-geojson.md` lock unified FeatureCollection contract
- `data/mock/dc-metro.geojson` with precomputed opportunity scores and fill colors
- `loadDcMetroGeoJson()` primary loader; legacy zip-metrics/boundaries deprecated
- Reventure-light UI: Mapbox light-v11, white shell, radio sidebar, on-map labels, bottom bar
- Hybrid navigation: scroll journey + click ZIP compare; stacked detail with forecast gauge

**Status:** T011–T015 → `done`. Sprint S003 complete (5/5).

### E004 / S004 — Phase 3 Valuation Leap (Mock-First)

- `docs/schema/property-valuation.md` documents property sidecar schema
- `data/mock/properties.json` with 3 DC sandbox listings (22201, 22202, 22204)
- Offer Range cards, renovation pills, calculation breakdown, comparable sales table
- Level 3 flow wired from ZIP detail via property picker and "Evaluate property" CTA
- Home value sparkline added to ZIP detail investor block


## 2026-07-11

### E006 / S007 — ADR-011 Follow-on (T030–T031)

- Migrated sandbox shards to `data/metros/{cbsa}.geojson` (47900 DC, 36740 Orlando)
- `GET /api/v1/metros/{cbsa}/geojson` returns bundled shard or 404 `{ "fallback": "national-tile-only" }`
- `fetchMetroShard` falls back to local `/api/v1` when no external API base is passed
- ADR-011 implementation checklist complete

**Status:** T030–T031 → `done`. Sprint S007 complete (2/2).

### E007 / S009 — Reventure Shell UX (T037–T039, T041)

- `TopBar` with local search (945 CBSAs + sandbox ZIPs) and geography tickers
- Sidebar reduced to data layers only (Popular / Investor / Hope-Core)
- Bottom national-hint and scroll story panels replaced by `ContextChip` + `StoryDrawer`
- Metro map labels capped by zoom tier to reduce national-view clutter
- DC story scroll camera triggers preserved; panels de-emphasized
- Sidebar expanded to five collapsible categories (Popular, Investor, Market Trends, Demographics, Hope-Core); slim mode adds layer search

**Status:** T037, T038, T039, T040, T041 → `done`. Sprint S009 complete (5/5).

### E007 / S010 — Discovery Journey (T042–T044)

- Discovery criteria panel: budget + cap rate / overvaluation / walkability / remote work filters
- `hybrid-scoring.ts` weighted rank with explainable breakdown from live shard geojson
- Top-3 cinematic flyover via **Find neighborhoods** — sequential pitched camera + context chip highlights
- Session criteria persistence; national view prompts sandbox metro drill-in

**Status:** T042, T043, T044 → `done`. T045 (analytics overlay) → `open`.

---

## 2026-07-11

### E007 / S008 — Sandbox expansion + metric wiring (ADR-012)

- DC sandbox: 5 → **18 ZIPs**; Orlando: 4 → **16 ZIPs** (TIGERweb ZCTA boundaries + live ingest merge)
- ACS ingest adds B25064 median gross rent for cap-rate proxy (annual rent / ZHVI)
- Metric-aware map legend (`legendStops`) — value gradient with min/max; opportunity terciles
- Bottom bar + tooltips show per-metric provenance (`METRIC_PROVENANCE`); mock fields tagged

**Status:** T035, T036 → `done`. Sandbox grid-up + legend fix ready for commit.

### E002 / S011 — Phase 2a Cinematic Polish (T051–T054)

- Spec: `docs/specifications/phase-2-cinematic-ux.md`
- Amenity POI glow layer (mock parks/transit/coffee per sandbox ZIP) during discovery flyover highlight
- Route path trace-in animation synced to flyover camera descent
- Unified `cinematicTourActive` chrome + analytics overlay CSS entrance
- Orlando SunRail + Lake Eola trail mock paths

**Status:** T051, T052, T053, T054 → `done`. T055 (QA) → `open`.

## 2026-07-12

### E007 / S008 — SF Bay live ingest + FHFA fix (T056)

- Re-ran `ingest:census-acs`, `ingest:zhvi --only=zip`, `ingest:redfin` for all **52** sandbox ZIPs (DC + Orlando + SF Bay)
- Fixed FHFA mapping: CBSA 41860 → MSAD **41884** (SF core proxy) for derived forecast/overvaluation
- `build-metro-shard.ts` MultiPolygon centroid fix (94611, 94704 flyover labels)
- Rebuilt `data/metros/{47900,36740,41860}.geojson` with full live stack

### E002 / S011 — SF Bay cinematic paths + amenities (T056)

- `data/mock/sf-bay-transit-path.geojson` — BART Market St, Golden Gate Park trail, Rockridge BART
- 54 amenity POIs for SF Bay ZIPs in `sandbox-amenities.geojson`
- Discovery guidance copy includes SF Bay sandbox

**Status:** T056 → `done`. T055 QA scope expanded to DC + Orlando + SF Bay.

### E007 / S008 — San Jose metro sandbox (T057)

- Added CBSA **41940** (San Jose-Sunnyvale-Santa Clara) with **16** sandbox ZIPs
- TIGER ZCTA boundaries, mock metrics, locale quotes, and `data/metros/41940.geojson` shard
- Live ingest overlay: ACS + ZHVI + FHFA (direct 41940) + Redfin for **68** total sandbox ZIPs
- FHFA direct CBSA 41940; ZHVI regionId 395059

### E002 / S011 — San Jose cinematic paths + amenities (T057)

- `data/mock/san-jose-transit-path.geojson` — VTA Light Rail, Caltrain Palo Alto, Los Gatos Creek trail
- 48 amenity POIs for San Jose ZIPs in `sandbox-amenities.geojson`
- `CinematicDiscovery` + `SANDBOX_METRO_CAMERAS` wired for San Jose drill-in

**Status:** T057 → `done`. T055 QA scope expanded to DC + Orlando + SF Bay + San Jose.

### E007 / S008 — San Jose metro sandbox (T057)

- Added CBSA **41940** (San Jose-Sunnyvale-Santa Clara) with **16** sandbox ZIPs
- TIGER ZCTA boundaries, mock metrics/quotes, live ACS + ZHVI + FHFA + Redfin overlay
- `data/metros/41940.geojson` shard; `SANDBOX_METRO_CAMERAS` + `CinematicDiscovery` wired
- VTA Light Rail, Caltrain Palo Alto, Los Gatos Creek trail paths + 48 amenity POIs
- Re-ran ingest for **68** total sandbox ZIPs

**Status:** T057 → `done`. T055 QA scope expanded to include San Jose.
