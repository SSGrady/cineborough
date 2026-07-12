---
id: S015
title: Discovery Moat
status: open
priority: P1
epic: E009
depends_on:
  - S014
---

# S015 — Discovery Moat

## Goal

Ship ADR-015 discovery moat: close WMIL interaction gaps (fly-to sidebar, priority toggles, deep-dive panel) and foundation for Cineborough differentiation (tension slider, micro-storytelling, custom indices).

## Phased delivery

See `docs/specifications/discovery-moat-roadmap.md`.

| Phase | Tickets | Target |
|-------|---------|--------|
| **1 — MVP** | T066, T067, T080, T078, T081 | WMIL interaction parity |
| **2 — v2** | T079, T088, T082, T089, T090 | Polish + metric expansion |
| **3 — Moat** | T083, T084, T085–T087 | Differentiation features |

## Tickets

| ID | Title | Phase | Status |
|----|-------|-------|--------|
| [T078](../../tickets/T078-flyto-matches-sidebar.md) | State-grouped fly-to matches sidebar | 1 | open |
| [T079](../../tickets/T079-histogram-distribution-polish.md) | Histogram distribution polish | 2 | open |
| [T080](../../tickets/T080-criterion-priority-toggles.md) | Criterion priority toggles | 1 | open |
| [T081](../../tickets/T081-deep-dive-split-panel.md) | Deep-dive split panel | 1 | open |
| [T082](../../tickets/T082-criteria-terminology-audit.md) | Criteria terminology audit | 2 | open |
| [T083](../../tickets/T083-investor-hopecore-tension-slider.md) | Investor ↔ Hope-Core tension slider | 3 | open |
| [T084](../../tickets/T084-cinematic-micro-storytelling.md) | Cinematic micro-storytelling | 3 | open |
| [T085](../../tickets/T085-custom-index-formula-engine.md) | Custom index formula engine | 3 | open |
| [T086](../../tickets/T086-custom-index-builder-ui.md) | Custom index builder UI | 3 | open |
| [T087](../../tickets/T087-custom-index-choropleth-wiring.md) | Custom index choropleth wiring | 3 | open |
| [T088](../../tickets/T088-compare-chips-pin-from-map.md) | Compare chips pin-from-map | 2 | open |
| [T089](../../tickets/T089-new-criterion-metrics.md) | New criterion metrics | 2 | open |
| [T090](../../tickets/T090-by-example-similarity.md) | By Example similarity mode | 2 | open |

## S014 prerequisites (not in S015 table)

| ID | Title | Status |
|----|-------|--------|
| T066 | Partial match % scoring engine | open |
| T067 | Criteria storage v3 | open |

## Recommended implementation order

### Phase 1 (start here)

1. T066 → T067 (S014 scoring + storage)
2. T080 — priority toggles
3. T078 — fly-to matches sidebar
4. T081 — deep-dive split panel

### Phase 2

5. T079 — histogram polish
6. T088 — compare pin-from-map
7. T082 — terminology audit
8. T089 — new metrics
9. T090 — By Example (stretch)

### Phase 3

10. T083 — tension slider + quadrant
11. T084 — micro-storytelling
12. T085 → T086 → T087 — custom index stack

## Scope

- Sandbox metros only (ADR-013): 68 ZCTAs
- Docs: ADR-015, `docs/specifications/discovery-moat-roadmap.md`
- User-facing vocabulary: criterion / criteria / match factors — no "wish"
