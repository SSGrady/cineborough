---
id: T089
title: New criterion metrics (park, physicians, airport, school)
status: done
type: feature
priority: P2
epic: E009
sprint: S015
depends_on:
  - T074
acceptance:
  - Park & Walk Score proxy from OSM ingest in criterion picker
  - Physicians per 10k from ACS-derived field in shard
  - Airport drive time placeholder (mock) and School Rating placeholder (mock)
  - All four metrics in docs/schema/metrics-taxonomy.md and packages/data types
  - Criterion cards support new metrics with histogram bins
---

# T089 — New Criterion Metrics

## Description

Expand criterion picker to WMIL category coverage. Carries S014 T075 scope per ADR-014 §5.

## Notes

Phase 2 metric expansion. Schema-first before UI.
