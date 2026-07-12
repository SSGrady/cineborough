---
id: T079
title: Histogram distribution polish
status: done
type: feature
priority: P2
epic: E009
sprint: S015
depends_on:
  - T068
  - T080
acceptance:
  - Bar histogram under dual-handle slider with hover bin count
  - Criterion band shaded on histogram bars
  - Histogram syncs with Heatmap toggle choropleth overlay
  - 20 bins from active sandbox shard values (memoized)
---

# T079 — Histogram Distribution Polish

## Description

Bring `CriterionRangeSlider` to full WMIL fidelity: bar chart under handles, band shading, and heatmap overlay sync per ADR-015 §2b.

## Notes

Part 1 WMIL gap #2. Partial implementation exists in `WishRangeSlider` / `CriterionRangeSlider`.
