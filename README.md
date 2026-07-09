# Cineborough

**Hope-core real estate** — a cinematic geospatial discovery engine for data-hungry buyers who want solid ROI *and* a neighborhood worth living in.

## Quick Links

| Resource | Path |
|----------|------|
| Agent orientation | [AGENTS.md](./AGENTS.md) |
| Architecture decisions | [docs/adr/](./docs/adr/) |
| Metric schema | [docs/schema/](./docs/schema/) |
| Product vision | [docs/vision/](./docs/vision/) |
| Project tracking | [beads/](./beads/) |
| MVP delivery plan | [PLAN.md](./PLAN.md) |

## MVP Scope

- **Metro:** Washington D.C. area (Arlington, Bethesda, core DC ZIPs)
- **Phase 1:** Reventure-style choropleth map with Opportunity Index + investor/hope-core sidebar layers
- **Data:** Mock JSON for 5 ZIPs → live Census/OSM → paid property APIs (phased)
- **Stack:** Next.js + Deck.gl + Mapbox GL JS

## Getting Started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

## Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
| [001](./docs/adr/001-project-vision-and-mvp-scope.md) | Project Vision and MVP Scope | Accepted |
| [002](./docs/adr/002-tech-stack-next-deck-mapbox.md) | Tech Stack: Next.js + Deck.gl + Mapbox | Accepted |
| [003](./docs/adr/003-data-sourcing-mock-first.md) | Data Sourcing: Mock-First Strategy | Accepted |
| [004](./docs/adr/004-dc-metro-geographic-sandbox.md) | DC Metro Geographic Sandbox | Accepted |
| [005](./docs/adr/005-data-schema-metric-taxonomy.md) | Data Schema and Metric Taxonomy | Accepted |
| [006](./docs/adr/006-map-ux-three-zoom-levels.md) | Map UX: Three Zoom Levels | Accepted |
| [007](./docs/adr/007-beads-project-tracking.md) | Beads Project Tracking System | Accepted |
| [008](./docs/adr/008-cinematic-ux-deferred.md) | Cinematic UX (Phase 2, Deferred) | Accepted |

Full index with summaries: [docs/adr/README.md](./docs/adr/README.md)
