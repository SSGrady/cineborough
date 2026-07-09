# S003 Progress — Reventure-Light UX Refactor

**Sprint:** S003  
**Epic:** E003  
**Status:** Complete (5/5)

---

## Completed

| Ticket | Title | Commit |
|--------|-------|--------|
| T011 | ADR + schema for unified GeoJSON | `f8991d8` |
| T012 | Build dc-metro.geojson | `5d4d498` |
| T013 | Unified GeoJSON loader | `05f61ce` |
| T014 | Reventure-light map shell | `e9cce88` |
| T015 | Hybrid nav + stacked detail | `cb3b2f3` |

## Notes

- ADR-009 locks grill-me decisions: unified FeatureCollection, precomputed choropleth fields, Reventure-light aesthetic
- `dc-metro.geojson` merges TIGER ZCTA boundaries + zip-metrics + locale quotes
- Deck.gl now consumes `loadDcMetroGeoJson()` directly; legacy loaders deprecated
- Contextual sidebar: full metric picker at metro, slim at ZIP detail
- Stacked detail: investor gauge block → hope-core → locale quote
