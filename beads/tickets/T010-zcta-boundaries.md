---
id: T010
title: Real ZCTA boundary GeoJSON
status: open
type: feature
priority: P2
epic: E002
sprint: S002
depends_on: []
acceptance:
  - zip-boundaries.geojson uses realistic ZCTA polygons (not squares)
  - All 5 sandbox ZIPs covered (22201, 22202, 22204, 20814, 20001)
  - Choropleth rendering unchanged
  - Source documented in file metadata or ticket notes
---

# T010 — Real ZCTA Boundary GeoJSON

## Description

Replace approximate square polygons in `data/mock/zip-boundaries.geojson` with simplified but realistic ZCTA shapes sourced from Census TIGER/Line (simplified for web bundle size).

## Notes

Full nationwide ZCTA ingest is out of scope — 5 sandbox ZIPs only per ADR-004.
