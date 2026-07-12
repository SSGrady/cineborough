---
id: T082
title: Criteria terminology audit & lint guard
status: done
type: chore
priority: P2
epic: E009
sprint: S015
depends_on:
  - T077
acceptance:
  - Zero "wish" strings in user-facing discovery components and copy
  - Stale Wish* component references documented with deprecation timeline
  - Optional grep/CI check for discovery UI string regressions
  - ADR-014 historical "wishlist" language noted as internal-only in spec cross-refs
---

# T082 — Criteria Terminology Audit

## Description

Finalize Part 1 gap #5: ensure T077 terminology refresh is complete across all discovery surfaces, tooltips, and error messages.

## Notes

Builds on T077. Internal code may retain `Wish*` filenames until T067 migration.
