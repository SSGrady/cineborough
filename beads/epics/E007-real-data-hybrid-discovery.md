---
id: E007
title: Real Data + Hybrid Discovery
status: in_progress
priority: P1
sprints:
  - S008
  - S009
  - S010
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

- [ ] Census ACS demographics live at ZIP + CBSA (remote work, homeowners 25–44, pop growth, median age, college degree)
- [ ] Financial metrics from ZHVI bulk + FHFA/HUD derived models (ADR-012)
- [ ] `Income Growth` added to schema + sidebar (currently missing)
- [x] Top search bar (county / city / ZIP / CBSA geocoding)
- [x] Geography tickers moved to top bar; sidebar = data layers only
- [x] Bottom scroll story panels replaced with compact top chip + optional detail drawer
- [x] Hybrid scoring engine returns top 3 neighborhoods from user criteria
- [ ] Cinematic flyover + analytics overlay on arrival

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S008](../sprints/S008-data-etl/sprint.md) | Real data ETL + refresh | open |
| [S009](../sprints/S009-reventure-shell/sprint.md) | Reventure shell UX | open |
| [S010](../sprints/S010-discovery-journey/sprint.md) | Discovery & valuation journey | open |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T032](../tickets/T032-census-acs-etl.md) | Census ACS demographics ETL | open |
| [T033](../tickets/T033-financial-proxy-etl.md) | FHFA/HUD financial proxy ETL | open |
| [T034](../tickets/T034-forecast-overvaluation.md) | Forecast + overvaluation model | open |
| [T035](../tickets/T035-derived-metrics-refresh.md) | Derived metrics + refresh cron | open |
| [T036](../tickets/T036-income-growth-metric.md) | Income growth schema + layer | open |
| [T037](../tickets/T037-top-search-bar.md) | Top search bar (geocoding) | done |
| [T038](../tickets/T038-top-geography-bar.md) | Geography tickers → top bar | done |
| [T039](../tickets/T039-compact-story-chrome.md) | Replace bottom scroll panels | done |
| [T040](../tickets/T040-sidebar-categories.md) | Sidebar category expansion | open |
| [T041](../tickets/T041-map-label-density.md) | Map label density by zoom | done |
| [T042](../tickets/T042-discovery-criteria-panel.md) | Discovery criteria panel | done |
| [T043](../tickets/T043-hybrid-scoring-engine.md) | Hybrid scoring engine | done |
| [T044](../tickets/T044-top3-flyover.md) | Top-3 cinematic flyover | done |
| [T045](../tickets/T045-analytics-overlay.md) | Analytics overlay on arrival | open |

## Dependencies

- ADR-012 public bulk ingest (supersedes ADR-003)
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
| Cap Rate, Market PSF | Derived (HUD FMR / ZHVI; ACS sqft) |
| Walkability | OSM proxy |
| Seller Desperation | Derived (when inventory signals available) |

**Paid ATTOM/API gate:** unlock only after S010 journey validated (see ADR-012).

