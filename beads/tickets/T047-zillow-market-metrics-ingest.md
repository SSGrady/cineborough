---
id: T047
title: Zillow Research market metrics ingest (DOM, price cuts, inventory)
status: done
type: feature
priority: P2
epic: E007
sprint: S008
depends_on: []
acceptance:
  - DOM + price_cuts + invt_fs CSVs ingested via ZHVI parser pattern
  - Cross-check values available for seller desperation
---

# T047 — Zillow Market Metrics Ingest

Optional cross-check source for Redfin DOM/price-cut validation. Redfin (T046) remains primary for display metrics.

## Done (2026-07-12)

Implemented in `19ee5b1`: `ingest:zillow-market` ingests median days-to-pending, price-cut share, and inventory for 68 sandbox ZIPs. `crossCheckRedfinWithZillow()` logs misalignments at shard build; display metrics unchanged.
