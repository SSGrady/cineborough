---
id: T066
title: Partial match % scoring engine
status: open
type: feature
priority: P1
epic: E008
sprint: S014
depends_on: []
acceptance:
  - wishlist-scoring.ts computes per-wish match 0-100 with pass/close/no-match status
  - Composite Match % uses priority weights (high = 2x)
  - All sandbox ZIPs ranked; no hard exclusion
  - Unit tests cover range, min, max decay and tie-break
---

# T066 — Partial Match % Scoring Engine

## Description

Replace `hybrid-scoring.ts` hard filters with ADR-014 partial-match scoring. New `rankByWishlist()` returns all ZIPs sorted by Match % with `WishMatchBreakdown[]` per location.

## Notes

- Deprecation shim on `rankNeighborhoods()` for one sprint
- `RankedNeighborhood.score` becomes `matchPct`
