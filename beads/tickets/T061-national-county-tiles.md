---
id: T061
title: National county tiles layer
status: done
type: feature
priority: P1
epic: E005
sprint: S012
depends_on:
  - T058
  - T060
acceptance:
  - Continental US county polygons (3,109) in data/boundaries/us-counties-20m.geojson
  - buildCountyChoropleth merges national metro aggregation with sandbox shard overrides
  - County tab shows all continental counties with state-fallback metrics for non-metro counties
  - Sandbox counties retain ZIP-level shard precision (10 counties)
  - Optional PMTiles via build-us-county-tiles.ts
  - Zoom-gated county labels with area budget
---

# T061 — National County Tiles Layer

Completed 2026-07-12.

- `fetch-us-counties.ts` — Census TIGERweb simplified continental counties
- `data/boundaries/us-counties-20m.geojson` — 3,109 counties (~1.1 MB)
- `us-counties.ts` — `buildCountyChoroplethFromMetros`, `buildCountyChoropleth` merge
- Metro centroid → county point-in-polygon; state-level fallback for rural counties
- `build-us-county-tiles.ts` + `county-tiles.ts` stub (ADR-011 county tier)
- `CinematicDiscovery` county tab uses `buildCountyChoropleth(US_METROS, SANDBOX_SHARDS)`
