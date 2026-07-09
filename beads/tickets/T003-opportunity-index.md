---
id: T003
title: Opportunity Index calculation
status: open
type: feature
priority: P1
epic: E001
sprint: S001
depends_on:
  - T002
acceptance:
  - Formula in packages/data/src/opportunity-index.ts matches docs/schema/opportunity-index.md
  - Normalization to 0–100 for choropleth color scale
  - Unit tests or typecheck pass
---

# T003 — Opportunity Index Calculation

## Description

Implement the composite Opportunity Index: `homePriceForecast1yr + remoteWorkPct − overvaluationPct`, with normalization across loaded ZIPs for choropleth rendering.

## Notes

Core functions scaffolded in packages/data. Wire into map layer in T004.
