---
id: T048
title: OSM/Overpass walkability proxy at ZCTA centroid
status: done
type: feature
priority: P1
epic: E007
sprint: S008
depends_on:
  - T010
acceptance:
  - ingest:osm-walkability scores sandbox ZIPs 0–100
  - walkabilityScore wired in merge-shard-metrics
  - OpenStreetMap attribution in provenance
---

# T048 — OSM Walkability Proxy

Completed 2026-07-11. `packages/data/src/ingest/ingest-osm-walkability.ts` queries Overpass for cafe/grocery/park/transit within 1 km of ZCTA centroids, caches raw responses, outputs `data/ingest/osm-walkability/normalized/zip-latest.json`.
