---
id: E006
title: Metro Vector Tiles
status: done
priority: P1
sprints:
  - S006
---

# E006 — Metro Vector Tiles

## Goal

Implement ADR-011 national tile path: tippecanoe build pipeline + Deck.gl MVTLayer for national choropleth at 3,100+ CBSA scale.

## Success Criteria

- [x] `build-us-metro-tiles` produces GeoJSONL + PMTiles (when tippecanoe available)
- [x] National view uses MVTLayer when `NEXT_PUBLIC_METRO_TILES_URL` is set
- [x] GeoJSON fallback when tiles missing
- [x] `fetchMetroShard` client stub for long-tail metros

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S006](../sprints/S006-metro-tiles/sprint.md) | Tile build + MVT render | Done |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T027](../tickets/T027-build-metro-tiles.md) | Tippecanoe tile build pipeline | done |
| [T028](../tickets/T028-mvt-layer-national.md) | MVTLayer national choropleth | done |
| [T029](../tickets/T029-fetch-metro-shard.md) | fetchMetroShard client loader | done |
