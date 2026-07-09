---
id: T003
title: Opportunity Index calculation
status: done
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

## Completion (2026-07-08)

- Formula verified against docs for ZIPs 22201, 22204, 20001
- `enrichWithOpportunityScores` alias wired in loaders
- `getOpportunityScoreExamples()` and `assertOpportunityScoresValid()` exported for verification
