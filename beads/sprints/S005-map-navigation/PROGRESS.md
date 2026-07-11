# S005 Progress — Map Navigation & Geography UX

Last updated: 2026-07-11

## Ticket Status

- [x] **T022** — Deck.gl `interleaved: false`, redraw on move, stop() before flyTo
- [x] **T023** — Explore map toggle; pointer-events pass-through on scroll track
- [x] **T024** — National/State/County/Metro/Zip camera presets
- [x] **T025** — Orlando metro shard (4 ZIPs) + `loadMetroShardsGeoJson()` merge loader
- [x] **T026** — ADR-011 national metro tile strategy (GeoJSON vs MVT vs API)

## Notes

### 2026-07-11

- User reported colored regions lagging on fast scroll — root cause: interleaved overlay + stacked flyTo animations
- User wants national scale + drag navigation — Explore map mode + geography toggles shipped; data ingest deferred

## Blockers

None for T022–T024.

## Velocity

5/5 tickets done (100%). Sprint S005 complete.

### 2026-07-11 (afternoon)

- **T026** — ADR-011 documents hybrid: MVT national layer + GeoJSON shards + API on-demand; `metro-tiles.ts` stub added
