# ADR 006: Map UX — Three Zoom Levels

## Status

Accepted

## Date

2026-07-08

## Context

The user journey progresses from broad market scan to specific neighborhood evaluation to property-level offer strategy. The map UX must support this progressive disclosure without requiring separate pages.

## Decision

### Level 1: Macro Metro View (Landing)

- **Default layer:** Opportunity Index choropleth across 5 sandbox ZIPs
- **Granularity toggle:** Metro (default) — future: County, State (disabled in MVP)
- **Sidebar:** Metric layer picker (investor + hope-core categories)
- **Interaction:** Click ZIP → zoom to Level 2

### Level 2: ZIP / Neighborhood Zoom

- **Map:** Single ZIP highlighted, adjacent ZIPs visible for context
- **Sidebar shifts to:** Zip-level signals panel (Reventure-style)
  - Left card: Forecast & Valuation (ZIP)
  - Right card: Demographics & Hope-Core signals
- **Optional:** Locale quote card (blurred background, Reddit-style — static mock in Phase 1)

### Level 3: Valuation Leap (Phase 3)

- **Trigger:** User enters property address or listing URL
- **UI:** Offer Range component
  - Conservative / Fair / Competitive price cards
  - Renovation adjustment pills (Off / Light / Full / Stud)
  - Calculation breakdown ("How we got there")
  - Comparable sales table

## Consequences

- Phase 1 implements Levels 1 and 2 only.
- Level 3 UI can be mocked with static fixtures before live offer engine.
- Map component must support programmatic zoom transitions between levels.

## Alternatives Considered

- **Separate pages per level** — rejected; breaks spatial continuity.
- **Single zoom with popover only** — rejected; insufficient data density for target persona.
