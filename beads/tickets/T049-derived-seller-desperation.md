---
id: T049
title: Derived sellerDesperationScore from live market signals
status: done
type: feature
priority: P1
epic: E007
sprint: S008
depends_on:
  - T046
acceptance:
  - sellerDesperationScore derived from Redfin DOM + price_drops proxy
  - Wired into merge-shard-metrics for sandbox ZIPs
  - Provenance updated to verified derived
---

# T049 — Derived Seller Desperation

Completed 2026-07-11. `packages/data/src/ingest/derived-market-signals.ts` implements taxonomy formula with Redfin `price_drops` → `priceCutCount` proxy; merged at shard build.
