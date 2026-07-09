---
id: T005
title: Sidebar metric taxonomy UI
status: done
type: feature
priority: P2
epic: E001
sprint: S001
depends_on:
  - T004
acceptance:
  - Sidebar groups metrics into Popular, Investor, and Hope-Core categories
  - Layer toggle switches choropleth metric
  - ZIP selection shows Forecast & Valuation + Demographics cards (Level 2)
  - Layout matches Reventure-style reference from vision docs
---

# T005 — Sidebar Metric Taxonomy UI

## Description

Reventure-style sidebar with metric layer picker and zip-level signals panel. Organize investor and hope-core halves per docs/schema/metrics-taxonomy.md.

## Completion (2026-07-08)

- Sidebar with Popular / Investor / Hope-Core metric groups from METRIC_LAYERS
- Metric toggle re-colors choropleth via getNormalizedMetricValues
- ZipDetailPanel with Forecast & Valuation and Demographics cards on ZIP select
