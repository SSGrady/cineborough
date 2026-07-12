# Beads Changelog

Aggregated progress log for Cineborough development.

---

## 2026-07-12

### Nationwide metro ingest pipeline

- CBSA catalog: 945 CBSAs, 918 with ZCTAs, 20,793 neighborhoods (`build:metro-catalog`)
- Batch orchestrator with checkpointing (`ingest:nationwide`, `ingest:status`)
- Per-metro pipeline: TIGERweb ZCTA polygons + ZHVI/Redfin/FHFA merge → `data/metros/{cbsa}.geojson`
- API route serves on-disk shards for metros beyond sandbox bundle
- Initial ingest: 29/918 metros (543 neighborhoods)

### S015 Phase 2 — Discovery v2 (T079, T088, T082, T089, T090)

- **T079** — Histogram bars with hover bin count, in-band shading, heatmap-sync accent
- **T088** — Map-click pin-to-compare offer (max 4), drag-reorder chips, full-bar hint
- **T089** — Four new criterion metrics in schema + shards: parkScoreProxy, physiciansPer10k, schoolRatingPlaceholder, airportDriveMin
- **T090** — By Example tab, cosine similarity on normalized metric vector, similarity % in matches list
- **T082** — `pnpm lint:discovery-terms` guard; zero user-facing "wish" strings; deprecation doc

**Status:** T079, T088, T082, T089, T090 → `done`.

### T080 — Criterion Priority Toggles

- Heatmap / High Priority / Just This toggles per criterion card (WMIL parity)
- High Priority doubles weight in composite Match %; Just This re-sorts by single criterion
- Storage v3 (`priority`, `heatmapActive`, `sortMode`); choropleth wired from criteria toggles

**Status:** T080 → `done`.

### T081 — Deep-Dive Split Panel

- `DiscoveryDeepDivePanel` (~40% right rail) with photo hero, Match % badge, tabbed breakdown
- My criteria tab: pass/close/no-match rows with mini bars; All data tab: `ZipDetailPanel` blocks
- Locale quote + Google Maps / Walk Score placeholder links; back to matches list

**Status:** T081 → `done`.

### T078 — State-Grouped Fly-To Matches Sidebar

- MatchesList groups ranked neighborhoods by state (WMIL-style headings)
- Row + CompareChips click → pitched `discoveryFlyoverCamera` flyTo; selected row syncs map + ContextChip
- `formatUsStateHeading` utility; discovery shell ContextChip shows match metrics

**Status:** T078 → `done`.

### E009 / S015 — Discovery Moat Strategy (ADR-015)

- **ADR-015** Discovery Moat Strategy — WMIL parity gaps (Part 1) + Cineborough differentiation (Part 2)
- **Roadmap:** `docs/specifications/discovery-moat-roadmap.md` — phased MVP → v2 → moat
- **Epic E009** Discovery Moat & Match Engine; **Sprint S015** with tickets T078–T090
- Part 1: fly-to sidebar, histogram polish, priority toggles, deep-dive split panel, terminology audit
- Part 2: tension slider, micro-storytelling, custom index builder + choropleth wiring
- S014 T070/T071/T072/T075/T076 scopes carried into S015 tickets

**Status:** E009 → `open`. S015 → `open`. T078–T090 → `open`.

### T077 — Discovery Criteria UX v2

- Renamed Wish* components to Criteria* (`CriteriaPanel`, `CriterionRangeSlider`, `CriterionCategoryPicker`)
- User-facing vocabulary: "Your criteria", "+ Add criterion" — no "wish" in UI/CSS
- `CriterionCategory` + `criterionCategory` in types; `criterion-metrics.ts`, `criterion-histogram.ts`
- Dark three-pane discovery shell CSS; tiered Match % badges in MatchesList + CompareChips
- Spec: `docs/specifications/discovery-criteria-ux-v2.md`

**Status:** T077 → `done`.

### T068/T069/T073 — WMIL Discovery Shell

- `WishlistPanel` replaces criteria drawer in sandbox discovery mode (dark #1a1a2e left rail)
- `WishRangeSlider` + `WishCategoryPicker`; `MatchesList` + `CompareChips`
- Three-pane layout in `CinematicDiscovery`; metric choropleth sidebar preserved outside discovery
- Partial match % from `hybrid-scoring` ranks all sandbox ZIPs (no hard-filter dead-end)

**Status:** T068, T069, T073 → `done`.

### T074 — Metric Taxonomy v2

- WMIL-aligned categories: Demographics, Market & Economics, Lifestyle & Walkability, Investor Signals, Education & Schools
- Display label renames (Median Home Price, Walk Score, Education Level, Seller Motivation)
- Sidebar + discovery add-filter dropdown share `METRIC_CATEGORY_ORDER`

**Status:** T074 → `done`.

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

## 2026-07-12

### E002 / S011 — Phase 2a manual QA (T055)

- End-to-end discovery tour verified for DC, Orlando, and SF Bay sandboxes (Puppeteer + manual checklist)
- Fixed default discovery criteria so Orlando/SF Bay produce ≥3 matches on live ingest
- Added missing amenity POIs (32803, 32835, 22203, 20037, 22302) and transit paths for SF/Orlando tour stops
- `build-metro-shard.ts`: `MetroGeometry` type fix

**Status:** T055 → `done`. S010/S011 discovery journey + Phase 2a cinematic QA complete.

---

## 2026-07-12

### E007 — Epic closed (Real Data + Hybrid Discovery)

- **S008** Real data ETL: Census ACS, ZHVI, FHFA, Redfin, OSM ingest for 68 sandbox ZCTAs across DC, Orlando, SF Bay, San Jose
- **S009** Reventure shell: top search bar, geography tickers, five-category sidebar, context chip + story drawer
- **S010** Discovery journey: criteria → hybrid scoring → top-3 flyover → analytics overlay; QA pass DC/Orlando/SF Bay
- **S011** Phase 2a cinematic polish (E002): amenity POI, route trace-in, unified tour chrome
- **T047** closed (optional Zillow cross-check; Redfin T046 satisfies MVP)
- **ADRs:** ADR-013 multi-metro sandbox; ADR-012 amended (Redfin/OSM ingest); `docs/schema/choropleth-color-scales.md`

**Status:** E007 → `done`. S008, S009, S010 → `done`. 20/21 E007 tickets done; T047 closed deferred.

### T058 — Sandbox county choropleth (S012)

- County tab wired to `buildCountyChoroplethFromShards` — 10 sandbox counties (VA/MD/DC/FL/CA)
- `ZIP_TO_COUNTY` mapping for 68 sandbox ZIPs; Census TIGER boundaries in `data/boundaries/sandbox-counties.geojson`
- `MapView` county labels + blocked drill-in clicks

**Status:** T058 → `done`. S012 → `done`.

### T060 — County drill-in, labels, fixed thresholds (S012)

- `COUNTY_FIPS_TO_CBSA` maps 10 sandbox counties to nearest metro shard
- County click drills into DC/Orlando/SF Bay/San Jose sandbox (replaces blocked clicks)
- Zoom-gated county labels: names ≥5.5, metric values ≥6.5
- County choropleth: data-only features, `opportunityScoreNormalized`, fixed $300k/$750k + forecast buckets

**Status:** T060 → `done`. S012 county geography expansion complete.

### T061 — National county tiles layer (S012)

- `data/boundaries/us-counties-20m.geojson` — 3,109 continental counties from Census TIGERweb (simplified)
- `buildCountyChoropleth` merges national metro centroid aggregation with sandbox shard ZIP overrides
- Rural counties without metro coverage inherit state-level metro average as fallback
- `build-us-county-tiles.ts` + `county-tiles.ts` stub for optional PMTiles (ADR-011 county tier)
- County labels zoom-gated with area budget (40/120/280 caps by zoom)

**Status:** T061 → `done`. S012 national county geography complete.

### T059 — San Jose Phase 2a QA (S011)

- Default discovery criteria yielded 0 matches for CBSA 41940 on live ingest; added `SAN_JOSE_DISCOVERY_CRITERIA` with auto-apply on sandbox drill-in
- Added BART Milpitas (95035) and VTA Rose Garden (95126) transit paths for top-3 tour stops
- Playwright headless QA + API verification pass

**Status:** T059 → `done`. All four sandboxes (DC, Orlando, SF Bay, San Jose) Phase 2a QA complete.

## 2026-07-12 (continued)

### S013 — Phase 2b Cinematic Scaffold (E002)

- T061–T065: 3D tiles flag stub, 3D camera paths, CSS motion, photo hero, satellite locale quotes
- ADR-008 amended with Phase 2b gating

**Status:** S013 → `done`.

### S013 — Cinematic UX discoverability polish

- CinematicEntryBar on sandbox drill-in (`Tour top neighborhoods` + DC `Story mode`)
- Photo hero decoupled from 3D tiles flag; shows on flyover highlight automatically
- MapView label centering fix during cinematic tour (billboard + focused ZIP)
- 3D scaffold badge when tiles flag enabled without API key

**Status:** S013 polish → `done`.

## 2026-07-12

### E008 / S014 — Wishlist Discovery grill-me (ADR-014)

- **ADR-014** Wishlist Discovery Engine — partial Match %, wish cards, priority weights, heatmap-per-metric, compare mode, taxonomy v2
- **UX spec:** `docs/specifications/wishlist-discovery.md` (WMIL benchmark: wheremightilive.com)
- **Epic E008** Wishlist Discovery (Where-Might-I-Live parity)
- **Sprint S014** with 11 tickets T066–T076: scoring engine, wish UI, matches list, compare chips, breakdown tabs, new metrics, By Example
- Root cause documented: E007 `evaluateFilters()` hard exclusion + permissive defaults → criteria feels like no-op

**Status:** E008 → `open`. S014 → `open`. T066–T076 → `open`.
