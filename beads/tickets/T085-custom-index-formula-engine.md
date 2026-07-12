---
id: T085
title: Custom index formula engine + schema
status: open
type: feature
priority: P1
epic: E009
sprint: S015
depends_on:
  - T074
acceptance:
  - CustomIndex type in packages/data with metric key + signed weight terms
  - evaluateCustomIndex() computes raw + normalized 0–100 scores per ZIP
  - Validation rejects unknown metrics and weights outside [-2, +2]
  - docs/schema/opportunity-index.md updated with custom index section
  - Example preset Digital Nomad Yield Index documented
---

# T085 — Custom Index Formula Engine

## Description

Backend for user-composed indices per ADR-015 §3c. Foundation for builder UI and choropleth layer.

## Notes

Part 2 moat #3a. Schema-first gate — all metrics must exist in metrics-taxonomy.md.
