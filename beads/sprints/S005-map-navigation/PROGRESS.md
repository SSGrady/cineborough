# S005 Progress — Map Navigation & Geography UX

Last updated: 2026-07-11

## Ticket Status

- [x] **T022** — Deck.gl `interleaved: false`, redraw on move, stop() before flyTo
- [x] **T023** — Explore map toggle; pointer-events pass-through on scroll track
- [x] **T024** — National/State/County/Metro/Zip camera presets
- [ ] **T025** — Second mock metro (e.g. Orlando) for pan-away demo
- [ ] **T026** — Document vector tile strategy for 3,100+ metros

## Notes

### 2026-07-11

- User reported colored regions lagging on fast scroll — root cause: interleaved overlay + stacked flyTo animations
- User wants national scale + drag navigation — Explore map mode + geography toggles shipped; data ingest deferred

## Blockers

None for T022–T024.

## Velocity

3/5 tickets done (60%).
