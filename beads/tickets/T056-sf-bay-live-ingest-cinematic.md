---
id: T056
title: SF Bay sandbox live ingest + cinematic polish
status: done
type: feature
priority: P1
epic: E007
sprint: S008
depends_on:
  - T046
  - T048
  - T049
acceptance:
  - Census ACS + ZHVI + Redfin live overlay for all 18 SF Bay ZIPs
  - FHFA derived forecast/overvaluation via MSAD 41884 proxy
  - MultiPolygon ZCTA centroids fixed for flyover
  - BART + park trail mock paths + amenity POIs for discovery tour
---

# T056 — SF Bay Live Ingest + Cinematic Polish

Completed 2026-07-12.

- Re-ran `ingest:census-acs`, `ingest:zhvi --only=zip`, `ingest:redfin` for 52 sandbox ZIPs
- Fixed `SANDBOX_CBSA_FHFA_MAP` 41860 → FHFA MSAD 41884
- `build:sf-geojson` now merges full live stack (ACS + ZHVI + FHFA + Redfin + OSM)
- `build-metro-shard.ts` handles MultiPolygon ZCTA centroids (94611, 94704)
- `data/mock/sf-bay-transit-path.geojson` — BART Market St + Golden Gate Park trail + Rockridge BART
- 54 amenity POIs added to `sandbox-amenities.geojson` for CBSA 41860
- Discovery guidance copy includes SF Bay sandbox
