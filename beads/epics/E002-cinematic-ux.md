---
id: E002
title: Cinematic UX
status: in_progress
priority: P1
sprints:
  - S002
  - S011
  - S013
---

# E002 — Cinematic UX

## Goal

Deliver scroll-driven neighborhood immersion per [ADR-008](../../docs/adr/008-cinematic-ux-deferred.md): camera fly-throughs, locale quotes, route overlays, and real ZIP boundaries.

## Success Criteria

- [x] Scroll-driven page layout with metro → neighborhood → detail sections
- [x] Locale quote card with blurred background (static mock for 22201)
- [x] Smooth map camera transitions integrated with scroll sections
- [x] Deck.gl PathLayer route overlay (mock Arlington transit/walk path)
- [x] Real ZCTA boundary GeoJSON replacing approximate squares
- [x] Google 3D tiles stubbed/deferred (ADR-008 amendment + T061)

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S002](../sprints/S002-cinematic-ux/sprint.md) | Phase 2 Cinematic UX (no 3D tiles) | Complete |
| [S011](../sprints/S011-phase-2a-cinematic/sprint.md) | Phase 2a polish — amenities, route trace, unified chrome | Complete |
| [S013](../sprints/S013-phase-2b-cinematic/sprint.md) | Phase 2b scaffold — 3D tiles flag, photo hero, motion | Complete |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T006](../tickets/T006-scroll-layout-shell.md) | Scroll-driven page layout shell | done |
| [T007](../tickets/T007-locale-quote-card.md) | Locale quote card component | done |
| [T008](../tickets/T008-map-camera-transitions.md) | Enhanced map camera transitions | done |
| [T009](../tickets/T009-route-path-overlay.md) | Route/path overlay on map | done |
| [T010](../tickets/T010-zcta-boundaries.md) | Real ZCTA boundary GeoJSON | done |
| [T051](../tickets/T051-amenity-poi-highlights.md) | Amenity POI highlight layer | done |
| [T052](../tickets/T052-route-path-trace-in.md) | Route path trace-in animation | done |
| [T053](../tickets/T053-unified-tour-chrome.md) | Unified cinematic tour chrome | done |
| [T054](../tickets/T054-orlando-transit-path.md) | Orlando transit path mock | done |
| [T055](../tickets/T055-phase-2a-qa.md) | Phase 2a manual QA | done |
| [T061](../tickets/T061-google-3d-tiles-stub.md) | Google 3D tiles stub + feature flag | done |
| [T062](../tickets/T062-gsap-3d-camera-paths.md) | GSAP 3D terrain camera paths | done |
| [T063](../tickets/T063-css-motion-choreography.md) | CSS motion card choreography | done |
| [T064](../tickets/T064-neighborhood-photo-hero.md) | 4K neighborhood photo hero | done |
| [T065](../tickets/T065-satellite-locale-quotes.md) | Satellite locale quote backdrop | done |

## Deferred (Post-S013)

- Google 3D tiles **production enablement** (billing approval) — stub shipped T061
- Framer Motion upgrade — CSS motion shipped T063
- Live 4K photography ingest — mock Unsplash shipped T064
- Spec: [`docs/specifications/phase-2-cinematic-ux.md`](../../docs/specifications/phase-2-cinematic-ux.md)
