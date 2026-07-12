---
id: T078
title: State-grouped fly-to matches sidebar
status: done
type: feature
priority: P1
epic: E009
sprint: S015
depends_on:
  - T073
acceptance:
  - MatchesList groups sandbox ZIPs by state with collapsible sections
  - Each row shows favorite heart, label, and Match % badge (tiered styling)
  - Click row triggers pitched flyTo ZIP centroid and syncs compare chip focus
  - Metro context chip updates on cross-CBSA selection
---

# T078 — State-Grouped Fly-To Matches Sidebar

## Description

Upgrade `MatchesList` right rail to WMIL-grade browse pattern: state-grouped sections, hero Match % badges, and click-to-flyTo map navigation per ADR-015 §2a and `discovery-criteria-ux-v2.md`.

## Completion (2026-07-12)

- State group headings via `formatUsStateHeading` + `groupMatchesByState` in `MatchesList.tsx`
- Discovery shell selection → `discoveryFlyoverCamera(match.center)` in `CinematicDiscovery.tsx`
- CompareChips share `handleMatchSelect`; ContextChip shows match metrics on selection
- CSS: `.matches-list__state`, `.matches-list__group-items`; neighborhood name primary in row

## Notes

Part 1 WMIL gap #1. Builds on T073 ranked list shell.
