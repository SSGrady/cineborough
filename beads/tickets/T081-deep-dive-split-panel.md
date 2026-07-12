---
id: T081
title: Deep-dive split panel (hero + Criteria vs All Data tabs)
status: done
type: feature
priority: P1
epic: E009
sprint: S015
depends_on:
  - T066
  - T078
acceptance:
  - Discovery-mode detail shows photo hero, ZIP label, and composite Match %
  - My Criteria tab shows per-criterion pass/close/no-match with mini band sliders
  - All Data tab retains ZipDetailPanel investor + hope-core blocks with provenance
  - Embedded external links (Google Maps, Walk Score proxy placeholder)
  - Replaces drawer-only flow when discovery shell is active
---

# T081 — Deep-Dive Split Panel

## Description

Tabbed location detail for discovery mode per ADR-015 §2d. Supersedes S014 T071 scope with hero image and embedded media.

## Notes

Part 1 WMIL gap #4. Reuses T064 photo hero pipeline and `ZipDetailPanel` blocks.

## Completion (2026-07-12)

- `DiscoveryDeepDivePanel` replaces matches rail on select (~40% width)
- Hero image, Match % badge, My criteria / All data tabs, locale quote, external links
- Back to matches list; discovery shell skips drawer-only flow
