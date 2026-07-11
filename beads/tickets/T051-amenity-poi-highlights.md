---
id: T051
title: Amenity POI highlight layer on discovery flyover
status: done
type: feature
priority: P1
epic: E002
sprint: S011
depends_on:
  - T044
acceptance:
  - Mock POI GeoJSON for DC + Orlando sandbox ZIPs
  - ScatterplotLayer glow during flyover highlight phase
  - No impact on overview choropleth or Home Value colors
---

# T051 — Amenity POI Highlights

## Completion (2026-07-11)

- `data/mock/sandbox-amenities.geojson` — 87 POIs (park, transit, coffee) across sandbox ZIPs
- `loadAmenityPois(zip)` in `packages/data/src/amenity-pois.ts`
- MapView ScatterplotLayer glow + dots; visible when `amenityHighlightZip` set during highlight phase
