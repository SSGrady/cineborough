---
id: E005
title: National Geography & Map Navigation
status: done
priority: P1
sprints:
  - S005
---

# E005 — National Geography & Map Navigation

## Goal

Fix map interaction jank from scroll-driven UX and unlock free panning + geography levels toward national / 3,100+ metro scale.

## Success Criteria

- [x] Deck.gl layers stay synced during scroll and flyTo (T022)
- [x] Drag-pan works on open map areas; Explore map mode for full navigation (T023)
- [x] National / State / County geography toggles fly camera (data still DC sandbox) (T024)
- [x] Metro shard ingest architecture documented + 2nd mock metro (T025)
- [x] Vector tile or CDN strategy for 3,100+ metros (T026 — ADR-011)

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S005](../sprints/S005-map-navigation/sprint.md) | Map nav + geography UX | Done |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T022](../tickets/T022-deck-gl-sync.md) | Deck.gl layer sync during scroll | done |
| [T023](../tickets/T023-explore-map-mode.md) | Explore map pan/zoom mode | done |
| [T024](../tickets/T024-geography-cameras.md) | Geography camera presets | done |
| [T025](../tickets/T025-second-mock-metro.md) | Second mock metro shard | done |
| [T026](../tickets/T026-metro-tile-strategy.md) | National metro tile strategy | done |
