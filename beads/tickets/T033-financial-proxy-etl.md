---
id: T033
title: ZHVI and FHFA bulk ingest
status: open
type: feature
priority: P1
epic: E007
sprint: S008
depends_on:
  - T032
acceptance:
  - Bulk CSV download from Zillow Research ZHVI (zip + metro levels) stored in data/ingest/zhvi/
  - FHFA HPI bulk CSV in data/ingest/fhfa-hpi/
  - Normalized tables join to CBSA and ZCTA via build scripts
  - ZHVI attribution documented per ADR-012
---

# T033 — ZHVI + FHFA Bulk Ingest

ADR-012. Official Zillow Research bulk downloads only — no scraping, no paid Zillow API.
