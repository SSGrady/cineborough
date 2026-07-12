---
id: S014
title: Wishlist Discovery
status: open
priority: P1
epic: E008
depends_on:
  - S010
---

# S014 — Wishlist Discovery

## Goal

Ship ADR-014 Wishlist Discovery MVP: partial Match % scoring, wish cards with histogram sliders, ranked matches list, compare chips, and match breakdown — WMIL parity for sandbox metros.

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T066](../../tickets/T066-partial-match-scoring.md) | Partial match % scoring engine | open |
| [T067](../../tickets/T067-wishlist-types-storage.md) | Wishlist types + storage v3 | open |
| [T074](../../tickets/T074-metric-taxonomy-v2.md) | Metric taxonomy v2 + wish categories | open |
| [T068](../../tickets/T068-wish-card-histogram-slider.md) | Wish card UI + histogram slider | open |
| [T069](../../tickets/T069-add-wish-category-picker.md) | Add Wish category picker | open |
| [T070](../../tickets/T070-wish-toggles-heatmap-priority.md) | Priority + heatmap + Just This toggles | open |
| [T073](../../tickets/T073-matches-ranked-list.md) | Matches ranked list + favorites | open |
| [T071](../../tickets/T071-match-breakdown-tabs.md) | Match breakdown + My Wishes / All Data tabs | open |
| [T072](../../tickets/T072-compare-location-chips.md) | Compare location chips | open |
| [T075](../../tickets/T075-new-wish-metric-candidates.md) | New metrics: park, airport, school, physicians | open |
| [T076](../../tickets/T076-by-example-similarity.md) | By Example similarity search | open |

## Recommended implementation order

1. T066 → T067 → T074 (data layer + types)
2. T068 → T069 → T070 (wish UI + map wiring)
3. T073 → T071 → T072 (results surfaces)
4. T075 → T076 (metric expansion + stretch)

## Scope

- Sandbox metros only (ADR-013): 68 ZCTAs
- Docs: ADR-014, `docs/specifications/wishlist-discovery.md`
- Deprecate `hybrid-scoring.ts` hard filters after T066 ships
