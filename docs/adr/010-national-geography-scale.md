# ADR 010: National Geography Scale Architecture

## Status

Accepted

## Date

2026-07-11

## Context

The MVP launched with a DC metro sandbox (ADR-004). User feedback requests:

1. **Free map navigation** — drag pan in all directions, not only scroll-driven zoom
2. **National scale** — eventually all 50 states and 3,100+ metros, not DC-only
3. **Scroll performance** — fast scrolling caused Deck.gl choropleth layers to desync from the Mapbox basemap (z-fighting / lag)

## Decision

### Map interaction model (hybrid)

| Mode | Behavior |
|------|----------|
| **Story mode** (default) | Page scroll drives cinematic sections; map `scrollZoom` disabled so wheel scrolls the page; **drag-pan enabled** on open map areas (`pointer-events: none` on scroll track) |
| **Explore map** | Body scroll locked; full map interaction (pan, scroll-zoom, box-zoom); no programmatic `flyTo` from scroll sections |

Toggle via bottom bar **Explore map** / **Story mode** button.

### Deck.gl / Mapbox sync

- `interleaved: false` on `MapboxOverlay` (reduces layer drift during `flyTo`)
- `map.stop()` before programmatic `flyTo` (cancels stacked animations on fast scroll)
- Redraw Deck overlay on `move` and `moveend`
- Deduplicate camera targets via stable key (skip redundant `flyTo`)
- Shorter default fly duration (1200ms)

### Geography levels (UI now, data later)

Enable sidebar toggles: National → State → Metro → County → Zip.

| Level | Camera (now) | Data (now) | Data (future) |
|-------|--------------|------------|---------------|
| National | US center, zoom 4 | DC sandbox ZIPs only | State/metro tiles |
| State | DMV region, zoom 8 | DC sandbox | State aggregates |
| Metro | DC MSA, zoom 10 | 5 ZIPs | Per-metro FeatureCollection |
| County | Arlington area, zoom 11 | 5 ZIPs | County polygons |
| Zip | Selected ZIP, zoom 12.5 | 5 ZIPs | ~33k ZCTAs |

**National ingest path (deferred):**

1. Metro-level `FeatureCollection` shards (`data/metros/{cbsa-id}.geojson`)
2. Build script merges metrics from ATTOM/Census pipelines
3. Vector tile fallback for 3,100+ metros at low zoom
4. On-demand fetch for ZIP detail

### Unified GeoJSON contract

Retain `dc-metro.geojson` enriched FeatureCollection pattern (ADR-009). National scale extends to `metros-us.geojson` (lightweight centroids + metrics) before full polygon ingest.

## Consequences

- Users can pan away from DC immediately; only DC ZIPs render until ingest epic ships
- Geography toggles change camera, not data coverage — UI shows sandbox hint
- Epic E005 tracks national scale work separately from UX fixes

## Alternatives Considered

- **Scroll-only navigation** — rejected per user feedback
- **Vector tiles only** — deferred; enriched GeoJSON sufficient for MVP sandbox
- **Keep geography toggles disabled** — rejected; toggles document the Reventure IA while panning proves navigation
