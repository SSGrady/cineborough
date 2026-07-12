# ADR 008: Cinematic UX (Phase 2, Deferred)

## Status

Accepted — **Amended 2026-07-12** (Phase 2b scaffolding)

## Date

2026-07-08

## Context

The north-star vision includes Google Earth-style cinematic fly-throughs, scroll-driven camera paths, locale quotes over blurred city photography, and route-accurate navigation lines over satellite imagery. This is the primary differentiator long-term but depends on a solid data foundation (Phase 1).

## Decision

**Defer all cinematic UX to Phase 2.** Document the intended architecture now; implement after Phase 1 exit criteria are met.

### Intended Phase 2 Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| 3D terrain + buildings | Google Maps Platform 3D Photorealistic Tiles | Google Earth immersion feel |
| Scroll-driven animation | GSAP ScrollTrigger | Camera path choreography |
| Data card overlays | React + Framer Motion | Fade-in zip signals during fly-through |
| Route visualization | Deck.gl `PathLayer` on 3D tiles | Transit lines, greenways, walk paths |
| Locale quotes | Static cards with blurred Unsplash/Mapbox imagery | Community sentiment (Reddit-style) |

### Intended User Flow

1. User scrolls → camera descends from metro overview into neighborhood
2. Transit lines and green spaces trace in as glowing paths
3. Data cards fade in with zip-level signals
4. Transition to static 4K neighborhood photography
5. Locale quote card appears over blurred background

### Phase 1 Non-Goals

- No 3D tiles, no scroll-driven camera, no GSAP integration
- No locale quote overlays (static mock in zip detail panel is acceptable)
- No route tracing animations

## Consequences

- Phase 1 map is a flat 2D choropleth — this is the product, not a placeholder.
- Deck.gl + Mapbox chosen in ADR-002 specifically to avoid rewrite for Phase 2.
- Phase 2 start requires new beads epic and ADR amendment if stack changes.

## Amendment (2026-07-12) — Phase 2b Gating

Phase 2a shipped on Mapbox 2D + pitch (S011). Phase 2b adds optional Google 3D Photorealistic Tiles behind feature flags:

| Flag | Default | Purpose |
|------|---------|---------|
| `NEXT_PUBLIC_ENABLE_3D_TILES` | `false` | Master switch for Google 3D tiles |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | unset | Required when 3D flag is on |

**Fail-safe:** Flag off or key missing → Mapbox outdoors + pitched 2D camera. Dev badge surfaces missing-key state.

**No-API polish (Phase 2b scaffold):** mock photo hero, Mapbox satellite locale quotes, CSS stagger motion.

**Cost gate:** Production 3D tiles require billing approval per E002.

## Alternatives Considered

- **Build cinematic first** — rejected; no data to visualize; demo without substance.
- **Skip cinematic entirely** — rejected; core differentiator and founder motivation.
- **GEOLayers 3 (After Effects)** — rejected for web app; useful as design reference only.
