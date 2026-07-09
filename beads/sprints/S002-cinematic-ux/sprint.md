---
id: S002
title: Phase 2 — Cinematic UX
status: in_progress
priority: P1
epic: E002
start_date: 2026-07-08
end_date: null
---

# S002 — Phase 2: Cinematic UX

## Goal

Build scroll-driven cinematic discovery per ADR-008, using GSAP ScrollTrigger + Deck.gl enhancements. Google 3D Photorealistic Tiles deferred until token/cost approval.

## Tickets

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| [T006](../../tickets/T006-scroll-layout-shell.md) | Scroll-driven page layout shell | P1 | done |
| [T007](../../tickets/T007-locale-quote-card.md) | Locale quote card component | P1 | done |
| [T008](../../tickets/T008-map-camera-transitions.md) | Enhanced map camera transitions | P1 | done |
| [T009](../../tickets/T009-route-path-overlay.md) | Route/path overlay on map | P2 | done |
| [T010](../../tickets/T010-zcta-boundaries.md) | Real ZCTA boundary GeoJSON | P2 | open |

## Progress

See [PROGRESS.md](./PROGRESS.md).

## Notes

- Phase 1 (S001) exit criteria met — all 5 tickets done.
- 3D tiles intentionally stubbed; Deck.gl + Mapbox stack unchanged per ADR-002.
- Suggested implementation order: T006 → T007 → T008 → T009 → T010.
