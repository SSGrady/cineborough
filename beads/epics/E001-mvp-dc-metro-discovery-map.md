---
id: E001
title: MVP — DC Metro Discovery Map
status: in_progress
priority: P1
sprints:
  - S001
---

# E001 — MVP: DC Metro Discovery Map

## Goal

Deliver a Reventure-style choropleth map for the DC metro sandbox that intersects investor-grade financial metrics with hope-core neighborhood discovery signals.

## Success Criteria

- [ ] 5 DC-area ZIPs render on choropleth map with Opportunity Index default layer
- [ ] Sidebar toggles investor and hope-core metric layers
- [ ] ZIP selection shows zip-level signals (forecast + demographics)
- [ ] Mock data powers all metrics (no live API dependency)
- [ ] Schema and types are documented and enforced

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| [S001](../sprints/S001-phase-1-data-engine/sprint.md) | Phase 1 Data Engine | In Progress |

## Tickets

| ID | Title | Status |
|----|-------|--------|
| [T001](../tickets/T001-repo-scaffold.md) | Repo scaffold | done |
| [T002](../tickets/T002-mock-data-dc-zips.md) | Mock data for 5 DC ZIPs | open |
| [T003](../tickets/T003-opportunity-index.md) | Opportunity Index calculation | open |
| [T004](../tickets/T004-choropleth-map.md) | Mapbox + Deck.gl choropleth | open |
| [T005](../tickets/T005-sidebar-metrics-ui.md) | Sidebar metric taxonomy UI | open |
