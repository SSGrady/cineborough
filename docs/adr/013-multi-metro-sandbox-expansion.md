# ADR 013: Multi-Metro Sandbox Expansion

## Status

Accepted (amends ADR-004)

## Date

2026-07-12

## Context

ADR-004 locked MVP geography to five DC-area ZIPs. E007 S008 expanded live ingest and enriched shards to additional metros for discovery-journey validation across contrasting markets (East Coast urban, Sun Belt growth, West Coast tech hubs).

National map tiles (ADR-011) cover 3,100+ CBSAs at overview zoom; **ZIP-level choropleth with live metrics remains sandbox-only** until a future shard catalog ADR.

## Decision

### Sandbox metros (E007 exit)

| CBSA | Metro | Sandbox ZIPs | Shard |
|------|-------|--------------|-------|
| 47900 | Washington-Arlington-Alexandria | 18 | `data/metros/47900.geojson` |
| 36740 | Orlando-Kissimmee-Sanford | 16 | `data/metros/36740.geojson` |
| 41860 | San Francisco-Oakland-Berkeley | 18 | `data/metros/41860.geojson` |
| 41940 | San Jose-Sunnyvale-Santa Clara | 16 | `data/metros/41940.geojson` |

**Total:** 68 sandbox ZCTAs (`ALL_SANDBOX_ZIPS` in `packages/data/src/validation.ts`).

### Amends ADR-004

- DC remains the **primary** sandbox (scroll story, locale quotes, founding corridors).
- Orlando, SF Bay, and San Jose are **validation sandboxes** for hybrid discovery + cinematic tour (S010/S011).
- Expanding beyond these four CBSAs or adding national ZIP ingest requires a new ADR.

### Ingest scope

All sandbox ZIPs participate in:

- Census ACS (`ingest:census-acs`)
- Zillow Research ZHVI zip bulk (`ingest:zhvi --only=zip`)
- FHFA HPI (CBSA mapping in `fhfa-hpi-sources.ts`; SF Bay uses MSAD 41884 proxy)
- Redfin market tracker (`ingest:redfin`) — DOM, PSF, price drops
- OSM walkability proxy (`ingest:osm-walkability`) — amenity density at ZCTA centroid

Shard build merges live ingest into `data/metros/{cbsa}.geojson` via `build-metro-shard.ts`.

### Discovery journey

Hybrid scoring, top-3 flyover, amenity POI highlights, route trace-in, and analytics overlay are **enabled only in sandbox metros**. National / non-sandbox drill-in shows guidance via context chip.

### Mock fixtures

`data/mock/` retains transit paths, amenity POIs, locale quotes, and dev/CI fixtures per sandbox. Production metrics on shards come from `data/ingest/` per ADR-012.

## Consequences

- ADR-004 five-ZIP table is historical; canonical ZIP lists live in `validation.ts`.
- QA scope for discovery tour: DC, Orlando, SF Bay (San Jose ingest complete; tour QA optional follow-on).
- AGENTS.md "single metro only" constraint is superseded for sandbox **count** but not for nationwide ZIP choropleth.

## References

- ADR-004 (original DC sandbox)
- ADR-012 (public bulk ingest)
- ADR-011 (shard delivery)
- `beads/epics/E007-real-data-hybrid-discovery.md`
