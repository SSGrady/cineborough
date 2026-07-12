---
id: S012
title: County Geography
status: done
epic: E005
start: 2026-07-12
---

# S012 — County Geography

Follow-on to E005: replace County tab stub with national county choropleth + sandbox drill-in.

## Tickets

| ID | Title | Status |
|----|-------|--------|
| T058 | Sandbox county choropleth | done |
| T060 | County drill-in, labels, thresholds | done |
| T061 | National county tiles layer | done |

## Exit Criteria

- County tab distinct from State tab (county polygons, not state aggregates)
- Continental US counties with metro/state-fallback metrics; sandbox counties use shard ZIP precision
- County click drills into nearest sandbox metro shard
- Fixed home-value and forecast color thresholds match ZIP-level semantics
- County labels zoom-gated with area budget
