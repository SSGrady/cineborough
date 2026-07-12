# S014 — Wishlist Discovery Progress

## Status: in progress

## Tickets

- [ ] T066 — Partial match % scoring engine
- [ ] T067 — Wishlist types + storage v3
- [x] T074 — Metric taxonomy v2 + wish categories
- [x] T068 — Wish card UI + histogram slider
- [x] T069 — Add Wish category picker
- [ ] T070 — Priority + heatmap + Just This toggles
- [x] T073 — Matches ranked list + favorites
- [ ] T071 — Match breakdown + My Wishes / All Data tabs
- [ ] T072 — Compare location chips
- [ ] T075 — New metrics: park, airport, school, physicians
- [ ] T076 — By Example similarity search

## Notes

- Grill-me session 2026-07-12 locked ADR-014 + UX spec
- E007 hard filters identified as root cause of "criteria no-op" perception
- WMIL benchmark: partial matches, wish cards, compare chips

## Session 2026-07-12 (WMIL shell)

- Three-pane discovery layout: dark left WishlistPanel, center map, right MatchesList
- WishRangeSlider (20-bin histogram), WishCategoryPicker (7 categories)
- CompareChips auto-pins top 3; favorites in localStorage
- Wired to `rankNeighborhoods(..., topN=0)` partial match % from hybrid-scoring
