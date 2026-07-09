---
id: E002
title: Cinematic UX
status: in_progress
priority: P1
sprints:
  - S002
---

# E002 — Cinematic UX

## Goal

Deliver scroll-driven neighborhood immersion per [ADR-008](../../docs/adr/008-cinematic-ux-deferred.md): camera fly-throughs, locale quotes, route overlays, and real ZIP boundaries — without Google 3D Photorealistic Tiles (deferred to later sprint).

## Success Criteria

- [ ] Scroll-driven page layout with metro → neighborhood → detail sections
- [ ] Locale quote card with blurred background (static mock for 22201)
- [ ] Smooth map camera transitions integrated with scroll sections
- [ ] Deck.gl PathLayer route overlay (mock Arlington transit/walk path)
- [ ] Real ZCTA boundary GeoJSON replacing approximate squares
- [ ] Google 3D tiles stubbed/deferred (documented in ticket notes)

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S002](../sprints/S002-cinematic-ux/sprint.md) | Phase 2 Cinematic UX (no 3D tiles) | In Progress |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T006](../tickets/T006-scroll-layout-shell.md) | Scroll-driven page layout shell | open |
| [T007](../tickets/T007-locale-quote-card.md) | Locale quote card component | open |
| [T008](../tickets/T008-map-camera-transitions.md) | Enhanced map camera transitions | open |
| [T009](../tickets/T009-route-path-overlay.md) | Route/path overlay on map | open |
| [T010](../tickets/T010-zcta-boundaries.md) | Real ZCTA boundary GeoJSON | open |

## Deferred (Post-S002)

- Google Maps Platform 3D Photorealistic Tiles (requires API token + cost approval)
- Framer Motion data card choreography
- Static 4K neighborhood photography transitions
