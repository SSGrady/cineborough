---
id: E003
title: Reventure-Light UX and Unified GeoJSON
status: done
priority: P1
sprints:
  - S003
---

# E003 — Reventure-Light UX and Unified GeoJSON

## Goal

Refactor Phase 1 map experience to match Reventure-light competitor UX and consolidate Deck.gl data into a single enriched GeoJSON FeatureCollection per ADR-009.

## Success Criteria

- [x] ADR-009 and deck-gl-geojson schema documented
- [x] `dc-metro.geojson` with precomputed opportunity scores and fill colors
- [x] `loadDcMetroGeoJson()` primary data loader
- [x] Light map shell, contextual sidebar, on-map labels, bottom bar
- [x] Hybrid scroll + click navigation with stacked ZIP detail story

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S003](../sprints/S003-reventure-light-ux/sprint.md) | Reventure-light UX refactor | Complete |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T011](../tickets/T011-adr-unified-geojson-schema.md) | ADR + schema for unified GeoJSON | done |
| [T012](../tickets/T012-dc-metro-geojson.md) | Build dc-metro.geojson | done |
| [T013](../tickets/T013-geojson-loader.md) | Unified GeoJSON loader | done |
| [T014](../tickets/T014-reventure-light-shell.md) | Reventure-light map shell | done |
| [T015](../tickets/T015-hybrid-nav-stacked-detail.md) | Hybrid nav + stacked detail | done |
