---
id: T058
title: Sandbox county choropleth
status: done
type: feature
priority: P1
epic: E005
sprint: S012
depends_on:
  - T057
acceptance:
  - County tab shows county polygons (not state shapes) for VA/MD/DC/FL/CA sandbox metros
  - 68 sandbox ZIPs mapped to 10 county FIPS via ZIP_TO_COUNTY
  - buildCountyChoroplethFromShards aggregates live shard metrics by county
  - County labels show name + active metric; clicks blocked from broken drill-in
  - Geography hint updated for sandbox counties
---

# T058 — Sandbox County Choropleth

Completed 2026-07-12.

- Added `data/boundaries/sandbox-counties.geojson` — 10 Census TIGER counties (VA/MD/DC/FL/CA)
- Added `packages/data/src/zip-to-county.ts` — `ZIP_TO_COUNTY` for 68 sandbox ZIPs
- Added `packages/data/src/us-counties.ts` — `buildCountyChoroplethFromShards()` mirroring `us-states.ts`
- `CinematicDiscovery.tsx` county branch uses shard aggregation (not state choropleth)
- `MapView.tsx` — `isCountyGeography`, county labels, blocked overview clicks
- Fetch script: `packages/data/src/scripts/fetch-sandbox-counties.ts`
