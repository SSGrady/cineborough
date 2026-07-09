# S001 Progress — Phase 1 Data Engine

Last updated: 2026-07-08

## Ticket Status

- [x] **T001** — Repo scaffold (AGENTS.md, ADRs, beads, packages, apps/web skeleton)
- [x] **T002** — Mock data for 5 DC ZIPs
- [x] **T003** — Opportunity Index calculation
- [x] **T004** — Mapbox + Deck.gl choropleth base map
- [ ] **T005** — Sidebar metric taxonomy UI

## Notes

### 2026-07-08

- Initial scaffold complete. All ADRs (001–008) written and indexed.
- Mock data JSON created with realistic values modeled on Reventure screenshots.
- Next.js skeleton ready; needs `pnpm install` + Mapbox token to run.
- T002: validation layer added; loaders validate sandbox ZIPs on load.
- T003: opportunity index formula verified; examples exported for all 5 ZIPs.
- T004: MapView with Deck.gl choropleth; ZIP click triggers Level 2 flyTo.

## Blockers

None.

## Velocity

4/5 tickets done (80%).
