# ADR 003: Data Sourcing — Mock-First Strategy

## Status

Accepted

## Date

2026-07-08

## Context

Financial metrics (price forecasts, cap rates, seller desperation, comps) require property-level data. Zillow scraping is legally risky and brittle. Paid APIs (ATTOM, DataTree) have cost and integration overhead. Census and OSM data is free but lacks financial depth.

The MVP must prove the UX thesis before investing in data pipelines.

## Decision

Sequence data integration in three tiers:

### Tier 1 — Mock (Phase 1, current)

Static JSON in `data/mock/zip-metrics.json` for 5 DC-area ZIPs. Values modeled on Reventure screenshot data (forecasts, PSF, demographics). Sufficient to build and demo the full map + sidebar UX.

### Tier 2 — Free APIs (Phase 1.5)

| Source | Data | License |
|--------|------|---------|
| U.S. Census ACS API | Demographics, remote work %, age cohorts, population growth | Public domain |
| BLS API | Local employment, wage trends | Public domain |
| OpenStreetMap / Overpass | Walkability proxies, green spaces, transit, POIs | ODbL |

### Tier 3 — Paid Property APIs (Phase 3)

| Source | Data | Notes |
|--------|------|-------|
| ATTOM DataTree | Property sales, tax assessments, comps | Paid; preferred for offer engine |
| Redfin Data Center | Market trends, inventory | Free tier available |
| Zillow Research (ZHVI) | Home value index time series | Download/API; not scraping |

**Explicit ban:** No scraping of Zillow, Realtor.com, or Apartments.com listing pages.

## Consequences

- All Phase 1 UI must work with mock data loaders (`packages/data/src/loaders.ts`).
- Metric types in `packages/data/src/types.ts` must accommodate both mock and live shapes.
- Transitioning to live data requires updating loaders, not UI components.

## Alternatives Considered

- **Live Census from day 1** — adds API integration complexity before UX is validated.
- **ATTOM from day 1** — premature cost; mock proves thesis first.
- **Zillow scraping** — rejected on legal and reliability grounds.
