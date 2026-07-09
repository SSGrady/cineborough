---
id: T012
title: Build dc-metro.geojson
status: done
type: feature
priority: P1
epic: E003
sprint: S003
depends_on: [T011]
acceptance:
  - data/mock/dc-metro.geojson contains all 5 sandbox ZIPs
  - Properties use flat camelCase per ADR-009
  - opportunityScore, opportunityScoreNormalized, fillColor precomputed
  - build-geojson.ts can regenerate the file
---

# T012 — Build dc-metro.geojson

Completed in commit `5d4d498`.
