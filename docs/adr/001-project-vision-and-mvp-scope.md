# ADR 001: Project Vision and MVP Scope

## Status

Accepted

## Date

2026-07-08

## Context

For a generation of millennial and Gen Z buyers, homeownership feels deferred and pessimistic. Existing tools force a false choice: dry investor platforms (Reventure, cap-rate spreadsheets) or consumer portals (Zillow pins) with zero financial foresight.

Cineborough bridges this gap as a *hope-core* spatial discovery engine — rigorous financial data layered over the urban fabric, showing where economic upside intersects with lived community.

## Decision

Build Cineborough in three phases:

1. **Phase 1 — Data Engine:** Reventure-style choropleth map with hybrid investor + hope-core sidebar metrics, mock data, Opportunity Index heatmap.
2. **Phase 2 — Cinematic UX:** 3D fly-throughs, scrollytelling, locale quotes (deferred).
3. **Phase 3 — Valuation Leap:** Offer range component (Conservative / Fair / Competitive) with calculation breakdown.

**Target user:** A data-hungry investor who *happens* to be looking for their perfect neighborhood — someone who wants cap-rate math *and* walkability to a great coffee shop.

**Primary journey:** Budget + metric filters → top neighborhoods highlighted on map → zip-level signals → (later) property offer range.

## Consequences

- Phase 1 must feel useful without cinematic visuals — the flat map is the product, not a placeholder.
- All feature work must trace to either investor metrics or hope-core discovery (or both).
- Scope creep into 3D or live valuation before Phase 1 exit criteria is prohibited.

## Alternatives Considered

- **Investor-only tool** — rejected; misses the hope-core thesis and differentiator.
- **Consumer-only neighborhood guide** — rejected; no financial credibility for target persona.
- **Build cinematic first** — rejected; no data foundation to visualize.
