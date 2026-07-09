# ADR 002: Tech Stack — Next.js + Deck.gl + Mapbox

## Status

Accepted

## Date

2026-07-08

## Context

Phase 1 needs a flat choropleth map (Reventure-style). Phase 2 needs 3D-ready rendering for cinematic fly-throughs. The stack must support both without a rewrite.

## Decision

| Layer | Choice | Rationale |
|-------|--------|-----------|
| App framework | Next.js 15 (App Router) | SSR for SEO, API routes for future data proxy, strong ecosystem |
| Base map | Mapbox GL JS | Vector tiles, custom styling, 3D terrain support |
| Data visualization | Deck.gl | WebGL choropleth, heatmaps, future 3D extrusions on Mapbox |
| Language | TypeScript (strict) | Shared types across `packages/data` and `apps/web` |
| Package manager | pnpm workspaces | Monorepo with `apps/web`, `packages/data`, `packages/geo` |
| Styling | Tailwind CSS | Utility-first for rapid sidebar/panel UI |

## Consequences

- `MAPBOX_TOKEN` required in `.env.local` (never committed).
- Deck.gl and Mapbox versions must stay compatible — pin in `package.json`.
- Server-side rendering of WebGL map is limited; map components are client-only (`"use client"`).

## Alternatives Considered

- **Vite + React + Leaflet** — simpler but no 3D path; would require rewrite for Phase 2.
- **CesiumJS** — powerful 3D globe but heavier than needed for Phase 1 choropleth.
- **Pure Mapbox GL (no Deck.gl)** — sufficient for Phase 1 but limits large-dataset overlay performance in Phase 2.
