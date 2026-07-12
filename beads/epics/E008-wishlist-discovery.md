---
id: E008
title: Wishlist Discovery (WMIL Parity)
status: open
priority: P1
sprints:
  - S014
depends_on:
  - E007
---

# E008 — Wishlist Discovery (Where-Might-I-Live Parity)

## Goal

Replace E007 hard-filter discovery with **Wishlist Discovery** — wish cards, partial Match %, histogram sliders, per-wish heatmap/priority, ranked matches list, compare chips, and match breakdown — per ADR-014 and `docs/specifications/wishlist-discovery.md`.

## Persona

Same hybrid hope-core homebuyer as E007, now expecting lifestyle-first discovery UX (WMIL benchmark) without losing investor credibility.

## Primary User Journey

1. **Wish** — add metric cards from category browser; set ranges on histogram sliders
2. **Match** — all sandbox ZIPs ranked by partial Match % (87% / 94% / 98%)
3. **Compare** — pin up to 4 neighborhoods; inspect per-wish pass/close/no-match
4. **Validate** — All Data tab + cinematic flyover to top 3 (E007 retained)

## Success Criteria

- [ ] Partial-match scoring replaces hard filters (`wishlist-scoring.ts`)
- [ ] Wishlist panel with + Add a Wish category picker
- [ ] Per-wish Heatmap / High Priority / Just This toggles
- [ ] Matches ranked list with heart favorites
- [ ] Compare location chips with Match %
- [ ] My Wishes vs All Data tabs on location detail
- [ ] Metric taxonomy v2 labels + wish categories
- [ ] New metric candidates schema-ready (park proxy, physicians, airport, school placeholder)
- [ ] By Example similarity mode (stretch / T076)

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S014](../sprints/S014-wishlist-discovery/sprint.md) | Wishlist discovery MVP | **open** |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T066](../tickets/T066-partial-match-scoring.md) | Partial match % scoring engine | open |
| [T067](../tickets/T067-wishlist-types-storage.md) | Wishlist types + storage v3 | open |
| [T068](../tickets/T068-wish-card-histogram-slider.md) | Wish card UI + histogram slider | open |
| [T069](../tickets/T069-add-wish-category-picker.md) | Add Wish category picker | open |
| [T070](../tickets/T070-wish-toggles-heatmap-priority.md) | Priority + heatmap + Just This toggles | open |
| [T071](../tickets/T071-match-breakdown-tabs.md) | Match breakdown + My Wishes / All Data tabs | open |
| [T072](../tickets/T072-compare-location-chips.md) | Compare location chips | open |
| [T073](../tickets/T073-matches-ranked-list.md) | Matches ranked list + favorites | open |
| [T074](../tickets/T074-metric-taxonomy-v2.md) | Metric taxonomy v2 + wish categories | open |
| [T075](../tickets/T075-new-wish-metric-candidates.md) | New metrics: park, airport, school, physicians | open |
| [T076](../tickets/T076-by-example-similarity.md) | By Example similarity search | open |

## Dependencies

- ADR-014 Wishlist Discovery Engine
- E007 discovery journey (baseline components)
- ADR-012 ingest for new ACS/OSM metrics (T075)
- `docs/schema/metrics-taxonomy.md` schema-first gate

## Competitor Benchmark

[Where Might I Live](https://wheremightilive.com) — wish cards, partial matches, compare chips, match breakdown. Cineborough retains investor signals + cinematic flyover as differentiators.
