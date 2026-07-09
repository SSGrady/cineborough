# ADR 007: Beads Project Tracking System

## Status

Accepted

## Date

2026-07-08

## Context

Cineborough is a personal project developed with AI agent assistance. It needs lightweight project tracking without Jira overhead. AutoCode's ADR-013 defines a bead data model (status, type, priority, parent-child, dependencies, acceptance criteria) that maps well to markdown files.

No existing `beads/` folder pattern exists in the user's personal repos.

## Decision

Implement file-based project tracking in `beads/` with three hierarchy levels:

```
beads/
├── README.md           # conventions and status legend
├── CHANGELOG.md        # aggregated progress log
├── epics/              # multi-sprint initiatives
├── sprints/            # time-boxed work units
│   └── S001-*/
│       ├── sprint.md   # goal, dates, ticket list
│       └── PROGRESS.md # running status updates
└── tickets/            # atomic tasks (cross-linked via frontmatter)
```

### Ticket Frontmatter Schema

```yaml
---
id: T001
title: Short title
status: open | in_progress | done | closed
type: feature | task | bug | chore
priority: P1 | P2 | P3
epic: E001
sprint: S001
depends_on: []
acceptance:
  - Criterion one
---
```

### Progress Update Protocol

When completing work, agents must update all three:
1. Ticket frontmatter (`status: done`) + completion comment in body
2. Sprint `PROGRESS.md` (checkboxes, notes)
3. `beads/CHANGELOG.md` (dated entry)

### ID Conventions

- Epics: `E001`, `E002`, ...
- Sprints: `S001`, `S002`, ...
- Tickets: `T001`, `T002`, ...

## Consequences

- Agents create tickets before non-trivial feature work (per AGENTS.md).
- Durable decisions from tickets must be promoted to ADRs — tickets are not maintained post-close.
- No external tooling required; pure markdown + git.

## Alternatives Considered

- **GitHub Issues** — rejected; wants repo-local, agent-readable tracking.
- **AutoCode platform beads** — rejected; requires platform infrastructure.
- **Flat ticket list only** — rejected; user chose full epic → sprint → ticket hierarchy.
