# S014 — Wishlist Discovery Progress

## Status: in progress

## Tickets

- [x] T066 — Partial match % scoring engine *(threshold wired in rankNeighborhoods + Find matches; unit tests pending)*
- [ ] T067 — Wishlist types + storage v3
- [x] T074 — Metric taxonomy v2 + criterion categories
- [x] T068 — Criterion card UI + histogram slider *(terminology refresh: T077)*
- [x] T069 — Add criterion category picker *(terminology refresh: T077)*
- [ ] T070 — Priority + heatmap + Just This toggles
- [x] T073 — Matches ranked list + favorites *(terminology refresh: T077)*
- [ ] T071 — Match breakdown + Criteria vs All Data tabs
- [ ] T072 — Compare location chips
- [ ] T075 — New metrics: park, airport, school, physicians
- [ ] T076 — By Example similarity search
- [x] T077 — Discovery criteria UX v2 (terminology + hybrid shell)

## Notes

- Grill-me session 2026-07-12 locked ADR-014 + UX spec
- E007 hard filters identified as root cause of "criteria no-op" perception
- WMIL benchmark: partial matches, criterion cards, compare chips
- **T077 (2026-07-12):** Renamed Wish* → Criteria*; spec at `docs/specifications/discovery-criteria-ux-v2.md`

## Session 2026-07-12 (Reactive matching + national rank)

- Removed blocking Find matches buttons; 200ms debounced reactive ranking with AbortController
- National rank via server-only `/api/v1/discovery/rank` (no client `node:fs` import)
- Floating Match Deck bottom-right; map stays edge-to-edge when deck collapsed
- Composite match keys `${cbsa}-${zip}` fix duplicate React keys nationally
- Histogram bar click sets criterion range; By Example city archetype cards
- Match ticker badge in TopBar + criteria header

## Session 2026-07-12 (Find matches fix)

- `rankNeighborhoods` filters by `DISCOVERY_MATCH_THRESHOLD` (40%) before returning matches
- Find matches passes normalized criteria synchronously (fixes stale React state on click)
- `runDiscoveryRanking` drills into selected/ingested metro via `resolveSelectedDiscoveryCbsa`
- Criteria panel preview uses `criteriaShardGeoJson` for overview-selected metros
- Empty-match ContextChip hint when all neighborhoods fall below threshold

## Session 2026-07-12 (WMIL shell)

- Three-pane discovery layout: dark left CriteriaPanel, center map, right MatchesList
- CriterionRangeSlider (20-bin histogram), CriterionCategoryPicker (7 categories)
- CompareChips auto-pins top 3; favorites in localStorage
- Wired to `rankNeighborhoods(..., topN=0)` partial match % from hybrid-scoring

## Session 2026-07-12 (Part 1 gap #1 — interactive fly-to)

- MatchesList groups by state (Florida, Virginia, etc.) with WMIL-style headings
- Row + CompareChips click → `discoveryFlyoverCamera` flyTo; selected row syncs map + ContextChip
- `formatUsStateHeading` utility for state labels

## Session 2026-07-12 (UX v2 hybrid)

- Cineborough-native vocabulary: "Your criteria", "+ Add criterion", Match % hero badges
- Dark rails `#14141f` + pink accent `#e11d48`; tiered match badge colors
- `CriterionCategory` / `criterionCategory` replaces wishCategory in types
