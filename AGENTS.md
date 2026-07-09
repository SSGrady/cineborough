# AGENTS.md — AI Agent Orientation

This file helps AI agents work effectively in the Cineborough codebase.

## What This Project Is

**Cineborough** is a *hope-core* real estate spatial discovery engine. It bridges institutional-grade financial data (price forecasts, cap rates, seller desperation) with neighborhood livability (demographics, walkability, remote-work density) for data-hungry buyers who want ROI *and* a place worth living.

The MVP is a Reventure-style choropleth map for the **DC metro sandbox** (Arlington/Bethesda corridors), with neighborhood discovery and mock offer-range valuation — cinematic 3D fly-throughs come in Phase 2.

Full vision: [`docs/vision/user-journey.md`](./docs/vision/user-journey.md)

## Source of Truth

Documentation falls into three tiers, in descending order of authority:

1. **Code** — what the system actually does right now.
2. **ADRs (`docs/adr/`) and design docs (`docs/schema/`, `docs/design/`)** — durable, maintained decisions. Kept in sync with the code.
3. **Beads tickets (`beads/tickets/`)** — point-in-time work items. Frozen when closed; durable outcomes must be promoted into ADRs or schema docs.

**For AI agents:** read ADRs and schema docs **before** implementing features that touch data models, metrics, or map behavior. Never invent metric formulas — they live in `docs/schema/`. Never expand beyond the DC metro sandbox without a new ADR.

## Repo Layout

```
cineborough/
├── AGENTS.md              ← you are here
├── PLAN.md                ← phased MVP delivery
├── apps/
│   └── web/               ← Next.js + Deck.gl + Mapbox (Phase 1 map UI)
├── packages/
│   ├── data/              ← shared types, mock loaders, metric helpers
│   └── geo/               ← geospatial utilities (bounds, color scales)
├── data/
│   └── mock/              ← static JSON for DC metro ZIPs (MVP data source)
├── docs/
│   ├── adr/               ← architecture decision records
│   ├── schema/            ← metric taxonomy, formulas (schema-first)
│   └── vision/            ← user journeys, product north star
└── beads/
    ├── epics/             ← multi-sprint initiatives
    ├── sprints/           ← time-boxed work units
    └── tickets/           ← atomic tasks (cross-linked to epic + sprint)
```

## Agent Workflow (Schema-First)

Adapted from autodesk-contentful-schema and DPS conventions:

1. **Read before write** — Check `docs/adr/README.md` and relevant schema docs before changing data models or map layers.
2. **ADR before major decisions** — New data sources, metric formulas, geographic scope changes, or tech stack swaps require a new ADR (or ADR amendment) before implementation.
3. **Beads ticket per feature** — Create or update a ticket in `beads/tickets/` before non-trivial work. Link to epic and sprint.
4. **Update progress** — When closing a ticket: update ticket frontmatter, sprint `PROGRESS.md`, and `beads/CHANGELOG.md`.
5. **Verify before claiming done** — Run `pnpm typecheck` and `pnpm lint` in `apps/web` before marking work complete.

## Phase Gates

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1: Data Engine** | Flat choropleth map, sidebar metrics, Opportunity Index, mock data | **Current** |
| **Phase 2: Cinematic UX** | 3D tiles, scrollytelling, camera fly-throughs | Deferred (ADR-008) |
| **Phase 3: Valuation Leap** | Live offer-range engine, property-level comps | Mock-first (ADR-009) |

Do not implement Phase 2 or live valuation APIs in Phase 1 work unless an ADR explicitly unlocks it.

## Critical Constraints

1. **Single metro only** — DC metro sandbox (Arlington, Bethesda, core DC ZIPs). No nationwide ingest.
2. **Mock-first data** — Financial metrics come from `data/mock/` until ADR-003 unlocks live APIs.
3. **No Zillow scraping** — Use ATTOM/DataTree/Redfin Data Center when going live; document in ADR.
4. **No hardcoded secrets** — API keys via `.env` only. See `apps/web/.env.example`.
5. **Schema-first metrics** — All displayed metrics must exist in `docs/schema/metrics-taxonomy.md` and `packages/data/src/types.ts`.
6. **TypeScript throughout** — No `.js` in `apps/` or `packages/`.

## Where to Find Things

| Need to... | Look here |
|---|---|
| Understand project vision | `docs/vision/user-journey.md` |
| See accepted architecture decisions | `docs/adr/README.md` |
| Find metric definitions and formulas | `docs/schema/metrics-taxonomy.md`, `docs/schema/opportunity-index.md` |
| Load mock ZIP data | `data/mock/zip-metrics.json` |
| Shared TypeScript types | `packages/data/src/types.ts` |
| Color scales / geo helpers | `packages/geo/src/` |
| Map UI components | `apps/web/src/components/` |
| Current sprint progress | `beads/sprints/` (latest `PROGRESS.md`) |
| Pick up or close work | `beads/tickets/` |
| Phased delivery plan | `PLAN.md` |

## Tech Stack Conventions

- **Framework:** Next.js 15 (App Router) in `apps/web`
- **Maps:** Mapbox GL JS + Deck.gl (3D-ready from day 1)
- **Language:** TypeScript strict mode
- **Package manager:** pnpm workspaces
- **Styling:** Tailwind CSS (when UI work begins)

## Beads Workflow

```
Epic (beads/epics/) → Sprint (beads/sprints/) → Ticket (beads/tickets/)
```

Each ticket file uses YAML frontmatter:

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

When completing work:
1. Set ticket `status: done` and add a completion comment
2. Update `beads/sprints/S00X/PROGRESS.md`
3. Append entry to `beads/CHANGELOG.md`

See [`beads/README.md`](./beads/README.md) for full conventions.

## Running Locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # add MAPBOX_TOKEN
pnpm dev                                          # starts apps/web on :3000
pnpm typecheck                                    # all packages
```

## Adding Documentation

- **New ADR:** Create `docs/adr/NNN-kebab-title.md` AND update `docs/adr/README.md` (index row + summary bullets).
- **New metric:** Add to `docs/schema/metrics-taxonomy.md` AND `packages/data/src/types.ts` before using in UI.
- **Structural repo changes:** Update this file's Repo Layout and Where to Find Things tables.
