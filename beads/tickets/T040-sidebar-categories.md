---
id: T040
title: Sidebar category expansion
status: done
type: feature
priority: P2
epic: E007
sprint: S009
acceptance:
  - Collapsible Popular, Investor, Hope-Core, Demographics sections
  - Slim mode shows full taxonomy or search-within-layers
---

# T040 — Sidebar Categories

## Completion (2026-07-11)

- Expanded `METRIC_LAYERS` categories to Popular, Investor, Market Trends, Demographics, and Hope-Core per `docs/schema/metrics-taxonomy.md`
- Sidebar sections are collapsible with layer counts; active metric's section auto-expands
- Slim mode shows full taxonomy with search filter across all layers
- Choropleth wiring unchanged via `CinematicDiscovery` → `MapView`
