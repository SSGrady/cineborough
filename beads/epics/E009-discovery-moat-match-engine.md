---
id: E009
title: Discovery Moat & Match Engine
status: open
priority: P1
sprints:
  - S015
depends_on:
  - E008
  - E002
---

# E009 — Discovery Moat & Match Engine

## Goal

Close remaining **WMIL interaction gaps** (Part 1) and ship **Cineborough differentiation** (Part 2) per ADR-015 and `docs/specifications/discovery-moat-roadmap.md` — turning discovery from parity chase into a defensible moat.

## Persona

Hybrid hope-core homebuyer who expects WMIL-grade lifestyle discovery *plus* investor-grade signals, cinematic place-feel, and composable indices ("Digital Nomad Yield Index").

## Primary User Journey

1. **Define** — add criterion cards, set ranges, toggle Heatmap / High Priority / Just This
2. **Browse** — state-grouped matches sidebar; click → flyTo ZIP; compare up to 4
3. **Deep-dive** — split panel with photo hero, My Criteria vs All Data tabs
4. **Differentiate** — tension slider blends investor vs hope-core; micro-story on select; custom index on map

## Success Criteria

### Part 1 — WMIL parity

- [ ] State-grouped fly-to matches sidebar with Match % badges
- [ ] Histogram distribution sliders at WMIL fidelity
- [ ] Per-criterion Heatmap / High Priority / Just This toggles
- [ ] Deep-dive split panel (hero, tabs, metric breakdown, media links)
- [ ] Zero "wish" in user-facing discovery UI (T082 audit)

### Part 2 — Cineborough moat

- [ ] Investor ↔ Hope-Core tension slider + quadrant map overlay
- [ ] Cinematic micro-storytelling on location select (GSAP + vibe quotes)
- [ ] Custom index formula engine + builder UI + choropleth layer
- [ ] Example preset: Digital Nomad Yield Index documented and demo-able

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S015](../sprints/S015-discovery-moat/sprint.md) | WMIL parity close-out + moat foundation | **open** |

## Tickets

| ID | Title | Phase | Status |
|----|-------|-------|--------|
| [T078](../tickets/T078-flyto-matches-sidebar.md) | State-grouped fly-to matches sidebar | 1 | open |
| [T079](../tickets/T079-histogram-distribution-polish.md) | Histogram distribution polish | 2 | open |
| [T080](../tickets/T080-criterion-priority-toggles.md) | Criterion priority toggles | 1 | open |
| [T081](../tickets/T081-deep-dive-split-panel.md) | Deep-dive split panel | 1 | open |
| [T082](../tickets/T082-criteria-terminology-audit.md) | Criteria terminology audit | 2 | open |
| [T083](../tickets/T083-investor-hopecore-tension-slider.md) | Investor ↔ Hope-Core tension slider | 3 | open |
| [T084](../tickets/T084-cinematic-micro-storytelling.md) | Cinematic micro-storytelling | 3 | open |
| [T085](../tickets/T085-custom-index-formula-engine.md) | Custom index formula engine | 3 | open |
| [T086](../tickets/T086-custom-index-builder-ui.md) | Custom index builder UI | 3 | open |
| [T087](../tickets/T087-custom-index-choropleth-wiring.md) | Custom index choropleth wiring | 3 | open |
| [T088](../tickets/T088-compare-chips-pin-from-map.md) | Compare chips pin-from-map | 2 | open |
| [T089](../tickets/T089-new-criterion-metrics.md) | New criterion metrics | 2 | open |
| [T090](../tickets/T090-by-example-similarity.md) | By Example similarity mode | 2 | open |

## S014 carry (prerequisites)

| ID | Title | Status |
|----|-------|--------|
| T066 | Partial match % scoring engine | open |
| T067 | Wishlist/criteria storage v3 | open |

## Dependencies

- ADR-015 Discovery Moat Strategy
- E008 S014 shell (T068, T069, T073, T077 done)
- E002 cinematic assets (locale quotes, GSAP cameras, photo hero)
- `docs/schema/metrics-taxonomy.md`, `docs/schema/opportunity-index.md`

## Competitive Position

| Capability | WMIL | Cineborough (post-E009) |
|------------|------|-------------------------|
| Partial Match % | ✓ | ✓ |
| Criterion histogram sliders | ✓ | ✓ |
| Investor signals category | ✗ | ✓ |
| Tension slider / quadrant | ✗ | ✓ |
| Custom index builder | ✗ | ✓ |
| Cinematic micro-stories | ✗ | ✓ |
| Live ingest provenance | ✗ | ✓ |
