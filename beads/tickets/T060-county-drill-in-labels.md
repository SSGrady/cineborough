---
id: T060
title: County drill-in, labels, fixed thresholds
status: done
type: feature
priority: P1
epic: E005
sprint: S012
depends_on:
  - T058
acceptance:
  - Clicking a sandbox county drills into nearest metro shard (DC/Orlando/SF Bay/San Jose)
  - County labels appear at zoom ≥5.5; metric values at zoom ≥6.5
  - County choropleth uses fixed $300k/$750k and forecast thresholds (data counties only)
  - opportunityScoreNormalized computed for county opportunity-score coloring
---

# T060 — County Drill-In, Labels, Fixed Thresholds

Completed 2026-07-12.

- `COUNTY_FIPS_TO_CBSA` + `sandboxCbsaForCounty()` in `zip-to-county.ts`
- County click opens sandbox metro drill-in (`CinematicDiscovery`, `MapView`)
- Zoom-gated county labels in `MapView` (names ≥5.5, values ≥6.5)
- `buildCountyChoroplethFromShards` filters data-only counties, normalizes opportunity scores
