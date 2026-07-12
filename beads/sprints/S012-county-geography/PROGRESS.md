# S012 — County Geography Progress

## Status: done

## Completed

- [x] T058 — Sandbox county choropleth (10 counties, ZIP_TO_COUNTY, buildCountyChoroplethFromShards)
- [x] T060 — County drill-in, zoom-gated labels, fixed thresholds
- [x] T061 — National county tiles (3,109 continental counties, metro aggregation + sandbox overrides)

## Notes

- County tab now shows all continental US counties with choropleth fills
- Non-sandbox counties use metro centroid aggregation; rural counties inherit state-level metro average
- Sandbox counties (VA, MD, DC, FL, CA) override with shard ZIP precision
- PMTiles path available via `pnpm build:us-county-tiles` (GeoJSONL fallback without tippecanoe)
- ADR-011 county tier deferred at zoom 10–12 is now MVP-complete with in-memory GeoJSON
