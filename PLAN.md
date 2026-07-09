# Cineborough MVP — Implementation Plan

Phased delivery for the hope-core real estate discovery engine.

## Assumptions

- Solo/personal project with AI agent assistance
- DC metro sandbox only until ADR-004 is amended
- Mock financial data until ingest pipelines are proven
- Schema-first: metrics defined in `docs/schema/` before UI implementation

## Phase 1: Data Engine (Complete)

**Goal:** Reventure-style flat choropleth landing page with hybrid investor + hope-core sidebar.

| Step | Deliverable | Beads Ticket |
|------|-------------|--------------|
| 1.1 | Repo scaffold (AGENTS, ADRs, beads, types) | T001 |
| 1.2 | Mock data for 5 DC ZIPs | T002 |
| 1.3 | Opportunity Index calculation | T003 |
| 1.4 | Mapbox + Deck.gl choropleth base map | T004 |
| 1.5 | Sidebar metric taxonomy UI | T005 |

**Exit criteria:** User can toggle Opportunity Index heatmap across 5 ZIPs and see zip-level signals for a selected area.

## Phase 2: Cinematic UX (Complete — 3D tiles deferred)

**Goal:** Scroll-driven camera fly-throughs, locale quotes, route overlays, real ZCTA boundaries.

See [ADR-008](./docs/adr/008-cinematic-ux-deferred.md). Epic E002 / Sprint S002 (T006–T010). Google 3D tiles deferred.

| Step | Deliverable | Beads Ticket |
|------|-------------|--------------|
| 2.1 | Scroll-driven page layout shell | T006 |
| 2.2 | Locale quote card component | T007 |
| 2.3 | Enhanced map camera transitions | T008 |
| 2.4 | Route/path overlay (Deck.gl PathLayer) | T009 |
| 2.5 | Real ZCTA boundary GeoJSON | T010 |

## Phase 3: Valuation Leap (Mock → Live)

**Goal:** Offer Range component (Conservative / Fair / Competitive) with calculation breakdown.

| Step | Deliverable |
|------|-------------|
| 3.1 | Mock offer engine for 2–3 test properties |
| 3.2 | Renovation adjustment pills |
| 3.3 | Comparable sales table |
| 3.4 | Live ATTOM/DataTree integration (ADR amendment required) |

## File Targets (Phase 1)

```
apps/web/src/
├── app/page.tsx                    # landing map
├── components/
│   ├── MapView.tsx                 # Deck.gl + Mapbox choropleth
│   ├── Sidebar.tsx                 # metric layer picker
│   ├── ZipDetailPanel.tsx          # zip-level signals
│   └── OpportunityLegend.tsx       # color scale legend
└── lib/
    └── loadMetrics.ts              # reads data/mock/

packages/data/src/
├── types.ts                        # ZipMetrics, OpportunityIndex
└── opportunity-index.ts            # formula implementation

data/mock/
└── zip-metrics.json                # 5 DC-area ZIPs
```

## Commit Style

Conventional commits: `feat:`, `docs:`, `chore:`, scoped to area (`feat(web):`, `docs(adr):`).
