---
id: T073
title: Matches ranked list + favorites
status: done
type: feature
priority: P1
epic: E008
sprint: S014
depends_on:
  - T066
  - T067
acceptance:
  - MatchesList sidebar shows all sandbox ZIPs ranked by Match %
  - Heart toggles favorites in discovery favorites storage
  - Matches grouped by state with WMIL-style headings
  - Click row or compare chip flies camera to ZIP centroid via discoveryFlyoverCamera
  - Selected row highlights; syncs with map selection and ContextChip
---

# T073 — Matches Ranked List + Favorites

> **Terminology refresh (T077):** Match % hero badges with tiered styling added in UX v2.

## Description

Left-rail ranked matches list per WMIL pattern. Replaces empty-results dead-end from hard filters.

## Completion (2026-07-12, Part 1 gap #1)

- State-grouped headings via `formatUsStateHeading` (`apps/web/src/lib/us-state-names.ts`)
- Row click + CompareChips → `discoveryFlyoverCamera` pitched flyTo in discovery shell
- ContextChip shows match % metrics when a match is selected
