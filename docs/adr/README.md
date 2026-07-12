# Architecture Decision Records

Architecture Decision Records (ADRs) for Cineborough — a hope-core real estate spatial discovery engine.

---

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-project-vision-and-mvp-scope.md) | Project Vision and MVP Scope | Accepted | 2026-07-08 |
| [002](./002-tech-stack-next-deck-mapbox.md) | Tech Stack: Next.js + Deck.gl + Mapbox | Accepted | 2026-07-08 |
| [003](./003-data-sourcing-mock-first.md) | Data Sourcing: Mock-First Strategy | Superseded | 2026-07-08 |
| [004](./004-dc-metro-geographic-sandbox.md) | DC Metro Geographic Sandbox | Accepted | 2026-07-08 |
| [005](./005-data-schema-metric-taxonomy.md) | Data Schema and Metric Taxonomy | Accepted | 2026-07-08 |
| [006](./006-map-ux-three-zoom-levels.md) | Map UX: Three Zoom Levels | Accepted | 2026-07-08 |
| [007](./007-beads-project-tracking.md) | Beads Project Tracking System | Accepted | 2026-07-08 |
| [008](./008-cinematic-ux-deferred.md) | Cinematic UX (Phase 2, Deferred) | Accepted | 2026-07-08 |
| [009](./009-ui-ux-and-geojson-schema.md) | Reventure-Light UI and Unified GeoJSON | Accepted | 2026-07-08 |
| [010](./010-national-geography-scale.md) | National Geography Scale Architecture | Accepted | 2026-07-11 |
| [011](./011-national-metro-tile-strategy.md) | National Metro Tile Strategy (3,100+ CBSAs) | Accepted | 2026-07-11 |
| [012](./012-public-bulk-data-ingest.md) | Data Sourcing: Public Bulk Ingest | Accepted | 2026-07-11 |
| [013](./013-multi-metro-sandbox-expansion.md) | Multi-Metro Sandbox Expansion | Accepted | 2026-07-12 |
| [014](./014-wishlist-discovery-engine.md) | Wishlist Discovery Engine | Accepted | 2026-07-12 |
| [015](./015-discovery-moat-strategy.md) | Discovery Moat Strategy | Accepted | 2026-07-12 |

---

## Summary

### ADR 001 — Project Vision and MVP Scope

Defines Cineborough as a hope-core bridge between investor-grade analytics and neighborhood livability:

- Target user: data-hungry investor who also wants to live in the neighborhood they buy into
- MVP delivers neighborhood discovery + mock valuation, not just a spreadsheet
- Three delivery phases: Data Engine → Cinematic UX → Valuation Leap
- Reventure-style choropleth map is the Phase 1 landing experience

### ADR 002 — Tech Stack: Next.js + Deck.gl + Mapbox

Locks the web stack for Phase 1 with 3D-ready foundations:

- Next.js 15 App Router for `apps/web`
- Mapbox GL JS for base map tiles and vector boundaries
- Deck.gl for choropleth layers and future 3D extrusions
- pnpm monorepo with shared `packages/data` and `packages/geo`
- TypeScript strict mode throughout

### ADR 003 — Data Sourcing: Mock-First Strategy

**Superseded by ADR-012.** Originally sequenced mock → free APIs → paid APIs. Revoked 2026-07-11.

### ADR 012 — Data Sourcing: Public Bulk Ingest

Replaces mock-first with periodic public bulk downloads:

- **Census ACS** — demographics, remote work, age cohorts, income growth
- **Zillow Research ZHVI** — bulk CSV home value index (ZIP/metro/city); no scraping
- **FHFA HPI + HUD FMR** — growth and rent proxies for cap rate / overvaluation models
- **Derived metrics** — forecast, overvaluation, opportunity score computed at build
- **Mock** demoted to dev/CI fixtures only
- **Paid APIs (ATTOM)** gated until S010 acceptance criteria met (S010 complete; gate open for future ADR)


### ADR 004 — DC Metro Geographic Sandbox

**Amended by ADR-013.** Original five-ZIP DC sandbox; see ADR-013 for current four-metro / 68-ZIP sandbox.

Constrains MVP geography to enable fast iteration:

- Primary corridors: Arlington (22201, 22202, 22204) and Bethesda (20814)
- Core DC: 20001 as urban contrast
- Geographic units: metro → ZIP (ZCTA) → property (Phase 3)
- No nationwide ZIP choropleth without ADR amendment

### ADR 005 — Data Schema and Metric Taxonomy

Organizes metrics into two complementary halves:

- **Investor half:** 1-yr forecast, overvaluation %, cap rate, days on market, seller desperation, PSF
- **Hope-core half:** remote work %, homeowners 25–44 %, population growth, walkability score
- **Composite:** Opportunity Index = forecast + remoteWork% − overvaluation%
- All metrics typed in `packages/data/src/types.ts` and documented in `docs/schema/`

### ADR 006 — Map UX: Three Zoom Levels

Defines the progressive disclosure map experience:

- Level 1 (Macro): metro/county choropleth with Opportunity Index default layer
- Level 2 (ZIP): zip-level signals + demographic card on selection
- Level 3 (Valuation): property address input → offer range component (Phase 3)
- Sidebar organizes layers by investor vs hope-core categories

### ADR 007 — Beads Project Tracking System

Establishes file-based project management adapted from AutoCode ADR-013:

- Hierarchy: `beads/epics/` → `beads/sprints/` → `beads/tickets/`
- YAML frontmatter on tickets (status, type, priority, dependencies, acceptance)
- Progress tracked via ticket frontmatter + sprint `PROGRESS.md` + root `CHANGELOG.md`
- Agents must create/update tickets before non-trivial feature work

### ADR 008 — Cinematic UX (Phase 2, Deferred)

Documents the north-star visual experience without implementing it in MVP:

- Google Maps 3D Photorealistic Tiles + GSAP scroll-driven camera paths
- Locale quotes (Reddit-style community sentiment overlays)
- Route-accurate navigation lines over satellite imagery
- Explicit non-goals for Phase 1; requires Phase 1 exit criteria first

### ADR 009 — Reventure-Light UI and Unified GeoJSON

Locks the Phase 1 UX refresh and data contract for Deck.gl:

- Single enriched `dc-metro.geojson` with geometry + flat camelCase metrics in `properties`
- Precomputed `opportunityScore`, `opportunityScoreNormalized`, `fillColor` / `fillColorRgb` at build time
- Reventure-light aesthetic: white shell, Mapbox light-v11, pink/red accents, on-map ZIP labels
- Contextual sidebar (full at metro, slim at detail), geography toggles (Metro/Zip enabled only)
- Hybrid navigation: scroll for journey, click for ZIP compare; stacked story detail panel

### ADR 010 — National Geography Scale Architecture

Addresses map jank and navigation toward national / 3,100+ metro scale:

- Story mode vs Explore map toggle — pan/zoom without scroll conflict
- Deck.gl sync fixes: `interleaved: false`, redraw on move, cancel stacked flyTo
- All geography toggles enabled; cameras fly to National/State/Metro/County/Zip
- Data remains DC sandbox until metro shard ingest (Epic E005 T025–T026)

### ADR 011 — National Metro Tile Strategy

Documents path from 58-metro mock choropleth + sandbox shards to 3,100+ CBSAs:

- **National zoom:** vector tiles (PMTiles/MVT) — not monolithic GeoJSON
- **Metro/ZIP zoom:** enriched GeoJSON shards per CBSA (`data/metros/{cbsa}.geojson`)
- **Long tail:** API on-demand fetch with client cache
- `metro-tiles.ts` stub; enable via `NEXT_PUBLIC_METRO_TILES_URL`

### ADR 013 — Multi-Metro Sandbox Expansion

Amends ADR-004 for E007 validation sandboxes:

- Four CBSAs: DC (47900), Orlando (36740), SF Bay (41860), San Jose (41940) — 68 ZCTAs
- Live ingest + enriched shards; hybrid discovery journey sandbox-only
- Choropleth fixed thresholds documented in `docs/schema/choropleth-color-scales.md`

### ADR 015 — Discovery Moat Strategy

Two-track discovery strategy after S014 hybrid shell — WMIL parity close-out plus Cineborough differentiation:

- **Part 1 (parity):** state-grouped fly-to matches sidebar, histogram sliders, priority toggles, deep-dive split panel, criteria terminology
- **Part 2 (moat):** investor ↔ hope-core tension slider + quadrant, cinematic micro-storytelling, custom index builder ("Digital Nomad Yield Index")
- Epic E009 / Sprint S015; roadmap at `docs/specifications/discovery-moat-roadmap.md`
- Builds on ADR-014 scoring semantics and `discovery-criteria-ux-v2.md` vocabulary

### ADR 014 — Wishlist Discovery Engine

Grill-me session (WMIL benchmark) replaces E007 hard-filter discovery with wish cards and partial Match %:

- **Wishes** replace filters — category browser, histogram range sliders, per-wish Heatmap / High Priority / Just This
- **Partial matches** — all sandbox ZIPs ranked 0–100%; pass / close / no-match per wish
- **Results UX** — matches list, compare chips, My Wishes vs All Data tabs
- **Taxonomy v2** — WMIL-aligned wish categories + cleaner labels (Median Home Price, Park & Walk Score)
- Spec: [`docs/specifications/wishlist-discovery.md`](../specifications/wishlist-discovery.md); Epic E008 / Sprint S014
