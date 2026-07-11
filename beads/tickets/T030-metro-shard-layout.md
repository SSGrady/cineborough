---
id: T030
title: Metro shard data layout migration
status: done
type: task
priority: P2
epic: E006
sprint: S007
depends_on:
  - T029
acceptance:
  - Shard files at data/metros/{cbsa}.geojson (47900, 36740)
  - metro-shards.ts and build scripts use new paths
  - dc-metro-geojson.ts import updated
---

# T030 — Metro Shard Layout

ADR-011 follow-on: migrate sandbox shards from `data/mock/*-metro.geojson` to `data/metros/{cbsa}.geojson`.
