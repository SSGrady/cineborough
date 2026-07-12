# ADR 004: DC Metro Geographic Sandbox

## Status

Accepted (amended by ADR-013)

## Date

2026-07-08

## Context

Nationwide real estate data ingest is a multi-month infrastructure project. The MVP must prove the hope-core thesis in a single, data-rich metro where the founder has local context.

## Decision

Lock MVP geography to the **Washington D.C. metropolitan area**, specifically:

| ZIP | Area | Role in sandbox |
|-----|------|-----------------|
| 22201 | Arlington, VA (Clarendon) | Walkable urban node, high remote-work density |
| 22202 | Arlington, VA (Crystal City) | Transit-connected, mixed investor/residential |
| 22204 | Arlington, VA (Glencarlyn) | Suburban contrast, affordability signal |
| 20814 | Bethesda, MD | Premium suburban, high income growth |
| 20001 | Washington, DC (Shaw/U Street) | Urban core, demographic diversity |

**Geographic unit hierarchy:**

1. **Metro** — DC-Arlington-Alexandria MSA (map default zoom)
2. **ZIP (ZCTA)** — primary data aggregation unit
3. **Property** — Phase 3 only (address-level valuation)

**Map bounds:** `[-77.2, 38.75]` to `[-76.85, 39.05]` (approximate DC metro envelope).

## Consequences

- All mock data, map tiles, and UI copy reference these 5 ZIPs.
- Expanding to Nashville (Reventure screenshot reference market) or other metros requires a new ADR.
- **2026-07-12:** ADR-013 expands sandbox to four metros (68 ZIPs) for E007; this ADR remains the DC origin record.
- GeoJSON boundaries for these ZIPs will be needed for choropleth rendering.

## Alternatives Considered

- **Nashville, TN** — matches Reventure screenshots but less local context for founder.
- **National view** — rejected; too broad for MVP data pipeline.
- **Single ZIP only** — rejected; need contrast between urban/suburban/premium nodes.
