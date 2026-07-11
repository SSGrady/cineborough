---
id: E002
title: Cinematic UX
status: in_progress
priority: P1
sprints:
  - S002
  - S011
---

# E002 — Cinematic UX

## Goal

Deliver scroll-driven neighborhood immersion per [ADR-008](../../docs/adr/008-cinematic-ux-deferred.md): camera fly-throughs, locale quotes, route overlays, and real ZIP boundaries — without Google 3D Photorealistic Tiles (deferred to later sprint).

## Success Criteria

- [x] Scroll-driven page layout with metro → neighborhood → detail sections
- [x] Locale quote card with blurred background (static mock for 22201)
- [x] Smooth map camera transitions integrated with scroll sections
- [x] Deck.gl PathLayer route overlay (mock Arlington transit/walk path)
- [x] Real ZCTA boundary GeoJSON replacing approximate squares
- [ ] Google 3D tiles stubbed/deferred (documented in ticket notes)

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S002](../sprints/S002-cinematic-ux/sprint.md) | Phase 2 Cinematic UX (no 3D tiles) | Complete |
| [S011](../sprints/S011-phase-2a-cinematic/sprint.md) | Phase 2a polish — amenities, route trace, unified chrome | In progress |

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
| [T055](../tickets/T055-phase-2a-qa.md) | Phase 2a manual QA | open |

## Deferred (Post-S011)

- Google Maps Platform 3D Photorealistic Tiles (requires API token + cost approval) — Phase 2b T056+
- Framer Motion data card choreography — Phase 2b T058
- Static 4K neighborhood photography transitions — Phase 2b T059
- Spec: [`docs/specifications/phase-2-cinematic-ux.md`](../../docs/specifications/phase-2-cinematic-ux.md)
