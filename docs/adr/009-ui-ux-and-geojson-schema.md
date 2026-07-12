# ADR 009 — Reventure-Light UI and Unified GeoJSON Schema

**Status:** Accepted  
**Date:** 2026-07-08  
**Deciders:** Product (grill-me session)

## Context

Phase 1 shipped a dark-themed choropleth with separate mock loaders for ZIP boundaries (`zip-boundaries.geojson`) and metrics (`zip-metrics.json`). Competitor reference (Reventure) and the Deerfield enriched-GeoJSON pattern show that Deck.gl performs best when geometry and display metrics live in a single `FeatureCollection` with precomputed choropleth fields.

A grill-me session locked UX and data-shape decisions for the next iteration.

## Decision

### 1. Unified GeoJSON contract

- Single file: `data/mock/dc-metro.geojson`
- Each feature = one sandbox ZIP (ZCTA polygon) with flat camelCase `properties` (geometry + metrics + vibe + precomputed scores)
- Deck.gl `GeoJsonLayer` reads this file directly; no runtime merge of boundaries + metrics
- Schema documented in [`docs/schema/deck-gl-geojson.md`](../schema/deck-gl-geojson.md)
- Regeneratable via `packages/data/src/build-geojson.ts` (or `pnpm --filter @cineborough/data build:geojson`)

### 2. Precomputed choropleth fields (build time)

Per feature, at GeoJSON generation:

- `opportunityScore` — raw formula from [`opportunity-index.md`](../schema/opportunity-index.md)
- `opportunityScoreNormalized` — 0–100 across all sandbox ZIPs
- `fillColor` — hex choropleth color from normalized opportunity score
- `fillColorRgb` — `[r, g, b]` for Deck.gl `getFillColor`
- `labelLng`, `labelLat` — polygon centroid for on-map labels

### 3. Reventure-light map aesthetic

- Mapbox `light-v11` base style (replacing `dark-v11`)
- White app shell, light sidebar cards, pink/red accent color (`#e11d48`) for active controls
- Data-dense but clean layout matching Reventure metro screenshots

### 4. Contextual left sidebar

| Scroll section | Sidebar mode |
|----------------|--------------|
| Metro overview | Full — radio metric picker, geography toggles, all metric groups |
| Neighborhood / ZIP detail | Slim — active metric + selected ZIP summary only |

### 5. Geography toggles (MVP)

- UI shows National / State / Metro / County / Zip toggles (Reventure parity)
- **Only Metro and Zip are enabled** for MVP; others render disabled
- Default: Metro choropleth at overview; Zip labels sharpen at detail

### 6. On-map labels

- TextLayer (or equivalent) shows `neighborhoodName` + formatted value for the active metric
- Matches Reventure on-region dollar labels (e.g. `$387,733`)

### 7. Bottom bar

Fixed map chrome:

- Tooltip toggle (show/hide hover labels)
- Data date indicator (`Data: May 2026` from collection metadata)
- Color legend pill for active metric — fixed vs tercile vs gradient semantics in [`docs/schema/choropleth-color-scales.md`](../schema/choropleth-color-scales.md)

### 8. Hybrid navigation

- **Scroll** advances the metro → neighborhood → detail journey (camera + section state)
- **Click** is primary within ZIP view: select ZIP, flyTo, open stacked detail panel
- Metric compare within a section via sidebar radio (no scroll required)

### 9. ZIP detail — stacked story layout

Single column, not Reventure's two-card row:

1. **Investor block** — forecast, cap rate, DOM, seller desperation, PSF
2. **Hope-core block** — remote work, walk score, age cohorts, walkability
3. **Locale quote** — `LocaleQuoteCard` with `localQuote` + `primaryVibe` from feature properties

### 10. Vibe fields inline

Each feature carries `localQuote` and `primaryVibe` in `properties` (Deerfield style), not a separate join at render time.

## Consequences

### Positive

- One source of truth for map rendering; simpler Deck.gl layer config
- Precomputed colors remove per-frame metric normalization in the layer
- Reventure-light UI improves data density and investor familiarity
- Contextual sidebar reduces noise at ZIP detail without losing metric context

### Negative / trade-offs

- GeoJSON file is larger (metrics duplicated per polygon)
- Property renames (`zip` → `zipCode`, etc.) require adapter layer for legacy `ZipMetrics` type until fully migrated
- `zip-metrics.json` and `zip-boundaries.geojson` remain as build inputs, not primary runtime sources

## Non-goals (unchanged)

- Live API ingest (ADR-003)
- National / State / County geography (disabled in UI only)
- Phase 2 cinematic 3D tiles (ADR-008)

## References

- [`docs/schema/deck-gl-geojson.md`](../schema/deck-gl-geojson.md)
- [`docs/schema/opportunity-index.md`](../schema/opportunity-index.md)
- ADR-004 (DC metro sandbox), ADR-006 (three zoom levels)
