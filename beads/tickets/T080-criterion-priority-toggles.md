---
id: T080
title: Criterion priority toggles (Heatmap / High Priority / Just This)
status: done
type: feature
priority: P1
epic: E009
sprint: S015
depends_on:
  - T066
  - T067
  - T068
acceptance:
  - High Priority doubles criterion weight in composite Match %
  - Heatmap toggle sets map choropleth to criterion metric (one active at a time)
  - Just This re-sorts matches by single criterion match
  - Toggle state persists in criteria storage v3
  - User-facing labels use "criterion" vocabulary (no "wish")
---

# T080 — Criterion Priority Toggles

## Description

Per-criterion card controls wired to scoring engine and `MapView` active layer. Supersedes S014 T070 with criteria-native vocabulary per ADR-015 §2c.

## Notes

Part 1 WMIL gap #3. Blocks T078 heatmap-sidebar integration.

## Completion (2026-07-12)

- Per-criterion Heatmap / High Priority / Just This toggles on `CriteriaPanel`
- Weighted composite Match % (2× for High Priority) in `hybrid-scoring.ts`
- Just This re-sorts via `getActiveSortMetric`; heatmap sets choropleth via `getCriteriaChoroplethMetric`
- Storage v3 persists `priority`, `heatmapActive`, `sortMode` per filter
