---
id: T004
title: Mapbox + Deck.gl choropleth
status: done
type: feature
priority: P1
epic: E001
sprint: S001
depends_on:
  - T002
  - T003
acceptance:
  - Mapbox GL JS base map renders with NEXT_PUBLIC_MAPBOX_TOKEN
  - Deck.gl GeoJsonLayer shows Opportunity Index choropleth for 5 ZIPs
  - Default view centers on DC metro bounds (ADR-004)
  - ZIP click triggers Level 2 zoom (ADR-006)
---

# T004 — Mapbox + Deck.gl Choropleth

## Description

Build the Phase 1 landing map: Mapbox base tiles + Deck.gl choropleth layer colored by Opportunity Index. Replace MapPlaceholder component.

## Completion (2026-07-08)

- `MapView` component with Mapbox GL JS + Deck.gl GeoJsonLayer
- Approximate ZIP boundaries in `data/mock/zip-boundaries.geojson`
- Default Opportunity Index choropleth with color legend
- ZIP click logs selection and flies to Level 2 zoom
