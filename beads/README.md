# Beads — Project Tracking

File-based project management for Cineborough. Adapted from [AutoCode ADR-013](https://github.com) bead data model.

## Hierarchy

```
Epic (multi-sprint initiative)
 └── Sprint (time-boxed work unit)
      └── Ticket (atomic task)
```

## Status Legend

| Status | Meaning |
|--------|---------|
| `open` | Defined, not started |
| `in_progress` | Actively being worked |
| `done` | Complete, acceptance criteria met |
| `closed` | Done and verified; no further work expected |

## ID Conventions

| Level | Format | Example |
|-------|--------|---------|
| Epic | `E001` | `E001-mvp-dc-metro-discovery-map` |
| Sprint | `S001` | `S001-phase-1-data-engine` |
| Ticket | `T001` | `T001-repo-scaffold` |

## Ticket Template

```markdown
---
id: T00X
title: Short descriptive title
status: open
type: feature | task | bug | chore
priority: P1 | P2 | P3
epic: E001
sprint: S001
depends_on: []
acceptance:
  - Criterion one
  - Criterion two
---

## Description

What and why.

## Notes

Progress comments go here.
```

## Progress Update Protocol

When completing a ticket:

1. Set `status: done` in ticket frontmatter
2. Add completion note in ticket body
3. Update `beads/sprints/S00X/PROGRESS.md` checkbox
4. Append dated entry to `beads/CHANGELOG.md`

## Current Active Work

- **Epic:** [E009 — Discovery Moat & Match Engine](./epics/E009-discovery-moat-match-engine.md)
- **Sprint:** [S015 — Discovery Moat](./sprints/S015-discovery-moat/sprint.md)
- **Prior:** [E008 / S014](./epics/E008-wishlist-discovery.md) — shell shipped (T077); scoring tickets carry as prerequisites
