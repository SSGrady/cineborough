---
id: T043
title: Hybrid scoring engine
status: done
type: feature
priority: P1
epic: E007
sprint: S010
depends_on:
  - T042
  - T035
acceptance:
  - Weighted rank across financial + hope-core metrics from user criteria
  - Returns top N neighborhoods with explainable score breakdown
---

# T043 — Hybrid Scoring Engine

## Completion (2026-07-11)

- `packages/data/src/hybrid-scoring.ts` — hard filters + weighted composite (cap rate, overvaluation, walkability, remote work, forecast)
- Scores live metrics from sandbox shard geojson (47900, 36740)
- Returns ranked list with per-metric normalized breakdown
