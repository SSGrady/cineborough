---
id: T046
title: Redfin market tracker bulk ingest (DOM, PSF, inventory, price drops)
status: done
type: feature
priority: P1
epic: E007
sprint: S008
depends_on: []
acceptance:
  - ingest:redfin downloads S3 gzip TSV and normalizes sandbox ZIPs
  - daysOnMarket and marketPsf wired via merge-shard-metrics
  - Redfin attribution in provenance
---

# T046 — Redfin Market Tracker Ingest

Completed 2026-07-11. `packages/data/src/ingest/ingest-redfin.ts` streams Redfin ZIP market tracker TSV, filters `All Residential` rows, keeps latest `period_end` per ZCTA, outputs `data/ingest/redfin/normalized/zip-latest.json`.
