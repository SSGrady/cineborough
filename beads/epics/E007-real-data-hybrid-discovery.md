---
id: E007
title: Real Data + Hybrid Discovery
status: done
priority: P1
sprints:
  - S008
  - S009
  - S010
  - S011
closed_date: 2026-07-12
---

# E007 — Real Data + Hybrid Discovery

## Goal

Replace mock metro/ZIP metrics with periodic real-data ingest (Census ACS + public financial proxies first), then ship Reventure-grade shell UX and the primary **Neighborhood Discovery & Valuation** journey for the hybrid hope-core homebuyer.

## Persona

Neither pure retail nor pure investor. Target: first-time / move-up buyer who needs portfolio math *and* neighborhood belonging proof.

## Primary User Journey

1. **Criteria** — budget + hybrid filters (min cap rate, max overvaluation, min walkability, remote-work floor)
2. **Recommend** — rank neighborhoods; cinematic flyover to top 3 with green-space/amenity highlights
3. **Validate** — overlay hard analytics (forecast, PSF comps, renovation adjustments, seller desperation)

## Success Criteria

- [x] Census ACS demographics live at ZIP + CBSA (remote work, homeowners 25–44, pop growth, median age, college degree)
- [x] Financial metrics from ZHVI bulk + FHFA/HUD derived models (ADR-012)
- [x] `Income Growth` added to schema + sidebar
- [x] Top search bar (county / city / ZIP / CBSA geocoding)
- [x] Geography tickers moved to top bar; sidebar = data layers only
- [x] Bottom scroll story panels replaced with compact top chip + optional detail drawer
- [x] Hybrid scoring engine returns top 3 neighborhoods from user criteria
- [x] Cinematic flyover + analytics overlay on arrival (Phase 2a polish via S011)

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S008](../sprints/S008-data-etl/sprint.md) | Real data ETL + refresh | **done** |
| [S009](../sprints/S009-reventure-shell/sprint.md) | Reventure shell UX | **done** |
| [S010](../sprints/S010-discovery-journey/sprint.md) | Discovery & valuation journey | **done** |
| [S011](../sprints/S011-phase-2a-cinematic/sprint.md) | Phase 2a cinematic polish (E002) | **done** |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T032](../tickets/T032-census-acs-etl.md) | Census ACS demographics ETL | done |
| [T033](../tickets/T033-financial-proxy-etl.md) | FHFA/HUD financial proxy ETL | done |
| [T034](../tickets/T034-forecast-overvaluation.md) | Forecast + overvaluation model | done |
| [T035](../tickets/T035-derived-metrics-refresh.md) | Derived metrics + refresh cron | done |
| [T036](../tickets/T036-income-growth-metric.md) | Income growth schema + layer | done |
| [T046](../tickets/T046-redfin-market-tracker-ingest.md) | Redfin market tracker ingest | done |
| [T047](../tickets/T047-zillow-market-metrics-ingest.md) | Zillow market metrics (optional) | closed |
| [T048](../tickets/T048-osm-walkability-proxy.md) | OSM walkability proxy | done |
| [T049](../tickets/T049-derived-seller-desperation.md) | Derived seller desperation | done |
| [T056](../tickets/T056-sf-bay-live-ingest-cinematic.md) | SF Bay live ingest + cinematic | done |
| [T057](../tickets/T057-san-jose-metro-sandbox.md) | San Jose metro sandbox | done |
| [T037](../tickets/T037-top-search-bar.md) | Top search bar (geocoding) | done |
| [T038](../tickets/T038-top-geography-bar.md) | Geography tickers → top bar | done |
| [T039](../tickets/T039-compact-story-chrome.md) | Replace bottom scroll panels | done |
| [T040](../tickets/T040-sidebar-categories.md) | Sidebar category expansion | done |
| [T041](../tickets/T041-map-label-density.md) | Map label density by zoom | done |
| [T042](../tickets/T042-discovery-criteria-panel.md) | Discovery criteria panel | done |
| [T043](../tickets/T043-hybrid-scoring-engine.md) | Hybrid scoring engine | done |
| [T044](../tickets/T044-top3-flyover.md) | Top-3 cinematic flyover | done |
| [T045](../tickets/T045-analytics-overlay.md) | Analytics overlay on arrival | done |

## Dependencies

- ADR-012 public bulk ingest (supersedes ADR-003)
- ADR-013 multi-metro sandbox (amends ADR-004)
- E006 tile + shard delivery (done)
- Metric schema: `packages/data/src/types.ts`, `docs/schema/metrics-taxonomy.md`

## Data Strategy

**ADR-012** (supersedes revoked ADR-003): public bulk ingest for validation without paid commercial feeds.

| Metric | Source |
|--------|--------|
| Remote Work %, Homeowners 25–44, Pop Growth, Median Age, College Degree, Income Growth | Census ACS bulk/API |
| Median Home Value, Growth YoY/MoM | Zillow Research ZHVI bulk CSV |
| HPI momentum | FHFA bulk CSV |
| Forecast 1-Yr, Overvalued % | Derived (ZHVI + FHFA) |
| Cap Rate, Market PSF | Derived (ACS rent / ZHVI; Redfin PSF) |
| Walkability | OSM proxy |
| Seller Desperation | Derived (Redfin DOM + price drops) |

**Paid ATTOM/API gate:** S010 journey validated; unlock via future ADR when license + budget approved (ADR-012).

---

## Epic Completion Summary (2026-07-12)

E007 delivered the hybrid hope-core discovery stack end-to-end across four sandbox metros (68 ZCTAs):

**Data (S008):** Live Census ACS, ZHVI, FHFA, Redfin, and OSM ingest merged into enriched metro shards for DC, Orlando, SF Bay, and San Jose. Derived forecast, overvaluation, cap rate, seller desperation, and walkability wired at shard build.

**Shell (S009):** Reventure-style top bar with local search, geography tickers, five-category sidebar, compact context chip + story drawer, zoom-tier label density.

**Discovery (S010):** Criteria panel → hybrid scoring → top-3 flyover → analytics overlay with provenance badges. QA pass on DC, Orlando, SF Bay (T055).

**Cinematic (S011, E002):** Amenity POI glow, route trace-in, unified tour chrome — without Google 3D tiles (ADR-008 Phase 2b deferred).

**Deferred:** Optional Zillow/Realtor cross-check ingests (T047/T050); paid ATTOM property-level feeds; national ZIP choropleth beyond sandbox list (ADR-013).

**Durable docs promoted:** ADR-013 (multi-metro sandbox), ADR-012 amendments (Redfin/OSM ingest), `docs/schema/choropleth-color-scales.md` (fixed legend thresholds).
