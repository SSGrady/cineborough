---
id: T074
title: Metric taxonomy v2 + wish categories
status: done
type: chore
priority: P1
epic: E008
sprint: S014
depends_on: []
acceptance:
  - METRIC_LAYERS gains wishCategory field
  - Display label renames per ADR-014 (Median Home Price, Park & Walk Score, etc.)
  - docs/schema/metrics-taxonomy.md v2 section added
  - Wish picker and sidebar remain distinct category systems
---

# T074 — Metric Taxonomy v2 + Wish Categories

## Description

Cleaner consumer-facing labels and WMIL-aligned wish categories without breaking MetricLayerKey types.

## Completion (2026-07-12)

- Reorganized `MetricLayerCategory` to Demographics, Market & Economics, Lifestyle & Walkability, Investor Signals, Education & Schools
- Renamed display labels (Median Home Price, Walk Score, Education Level, Seller Motivation, etc.)
- Exported `METRIC_CATEGORY_LABELS` / `METRIC_CATEGORY_ORDER` for sidebar + discovery add-filter dropdown
- `incomeGrowthRate` remains excluded from `METRIC_LAYERS` and discovery filters
