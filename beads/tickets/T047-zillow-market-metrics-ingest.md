---
id: T047
title: Zillow Research market metrics ingest (DOM, price cuts, inventory)
status: closed
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

Optional cross-check source. Not implemented in MVP slice — Redfin ingest (T046) satisfies DOM, PSF, and price-drop signals for seller desperation (T049).

## Closure (2026-07-12)

Closed with E007 epic. Re-open only if Redfin data quality gaps require Zillow Research cross-validation.
