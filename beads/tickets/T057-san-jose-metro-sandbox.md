---
id: T057
title: San Jose metro sandbox (CBSA 41940)
status: done
type: feature
priority: P1
epic: E007
sprint: S008
depends_on:
  - T056
acceptance:
  - 16 ZIPs across San Jose, Sunnyvale, Santa Clara, Palo Alto, Mountain View, Cupertino
  - TIGER ZCTA boundaries fetched and shard built at data/metros/41940.geojson
  - ALL_SANDBOX_ZIPS expanded; live ACS + ZHVI + FHFA + Redfin overlay at shard build
  - VTA/Caltrain/trail paths + amenity POIs for discovery cinematic
  - CinematicDiscovery, metro-shards, geography-cameras wired for CBSA 41940
---

# T057 — San Jose Metro Sandbox

Completed 2026-07-12.

- Added `SAN_JOSE_SANDBOX_ZIPS` (16 ZIPs) to `validation.ts` and `ALL_SANDBOX_ZIPS` (68 total)
- `fetch:zcta-boundaries` → `data/mock/san-jose-zip-boundaries.geojson`
- `seed:sandbox-metrics` → `san-jose-zip-metrics.json` + `san-jose-locale-quotes.json`
- `build:san-jose-geojson` → `data/metros/41940.geojson` with live ingest overlay
- FHFA CBSA 41940 direct mapping; ZHVI regionId 395059
- `san-jose-transit-path.geojson` — VTA Light Rail, Caltrain Palo Alto, Los Gatos Creek trail
- 48 amenity POIs added to `sandbox-amenities.geojson` for CBSA 41940
- Re-ran `ingest:census-acs`, `ingest:zhvi --only=zip`, `ingest:redfin` for 68 sandbox ZIPs
