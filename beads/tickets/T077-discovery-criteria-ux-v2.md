---
id: T077
title: Discovery criteria UX v2 — terminology + hybrid shell
status: done
type: feature
priority: P1
epic: E008
sprint: S014
depends_on:
  - T068
  - T069
  - T073
acceptance:
  - No "wish" in user-facing UI, component names, or CSS class prefixes
  - CriteriaPanel, CriterionRangeSlider, CriterionCategoryPicker replace Wish* components
  - CriterionCategory + criterionCategory in types (replaces wishCategory)
  - Three-pane discovery layout with dark rails + pink accent Match % badges
  - Design doc at docs/specifications/discovery-criteria-ux-v2.md
---

# T077 — Discovery Criteria UX v2

## Description

Hybrid redesign blending Cineborough investor/hope-core identity with WMIL discovery excellence. Renames Wish* surface to Cineborough-native **criterion** vocabulary per grill-me feedback.

## Completion (2026-07-12)

- Spec: `docs/specifications/discovery-criteria-ux-v2.md`
- Components: `CriteriaPanel`, `CriterionRangeSlider`, `CriterionCategoryPicker`
- Data: `criterion-metrics.ts`, `criterion-histogram.ts`; `CriterionCategory` type
- CSS: `criteria-panel`, `criterion-card`, `criterion-range`, `matches-list`, `compare-chips` discovery shell
- TopBar: "Your criteria" button; context chip actions updated
