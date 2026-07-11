# S009 Progress

## Tickets

- [x] **T037** — Top search bar (local metro/ZIP index, no paid geocoding)
- [x] **T038** — Geography tickers moved to top bar; sidebar = data layers only
- [x] **T039** — Bottom story panels replaced with context chip + detail drawer
- [x] **T040** — Sidebar category expansion
- [x] **T041** — Map label density capped by zoom tier

## Notes

- `TopBar` combines brand, `SearchBar`, and `GeographyBar` (Reventure-style shell).
- Search MVP indexes 945 CBSAs from `loadUsMetrosGeoJson()` plus sandbox ZIPs; sandbox metros drill in, others fly-to center.
- DC story scroll triggers remain for cinematic camera; visible bottom panels retired in favor of `ContextChip` + `StoryDrawer`.
- Metro labels at national zoom capped at 24/60/140 by map zoom to reduce overlap.
- Sidebar expanded to five collapsible categories (Popular, Investor, Market Trends, Demographics, Hope-Core); slim mode adds layer search.
