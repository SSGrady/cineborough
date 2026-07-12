# ADR 012: Data Sourcing — Public Bulk Ingest

## Status

Accepted

## Date

2026-07-11

## Context

ADR-003 deferred all live data until UX validation, keeping financial metrics in hand-authored mock JSON. E007 requires real metrics for the hybrid discovery journey without paying for Reventure-grade commercial feeds (ATTOM, production Zillow APIs) before that journey is proven.

Public bulk datasets exist that are sufficient for validation:

- **U.S. Census ACS** — demographics, remote work, age cohorts, population growth, income
- **FHFA / HUD** — home price indices, fair market rent proxies
- **Zillow Research ZHVI** — bulk CSV downloads of home value index time series at ZIP, metro, city, county, state, and national levels (not scraping; official research data portal)

Mock data remains useful for offline dev and unit tests but must not be the production source of truth.

## Decision

### Supersedes ADR-003

ADR-003 (Mock-First Strategy) is **revoked**. Live public bulk ingest begins in E007 S008.

### Production data stack (MVP)

| Source | Format | Metrics | Refresh |
|--------|--------|---------|---------|
| Census ACS | API + bulk tables | Remote work %, homeowners 25–44, pop growth, median age, college degree, income growth | Annual ACS release + quarterly rebuild |
| Zillow Research ZHVI | Bulk CSV download | Median home value, home value growth YoY/MoM, forecast proxy, overvaluation proxy | Monthly ZHVI publish |
| FHFA House Price Index | Bulk CSV | Metro/state HPI, growth rates | Quarterly |
| HUD FMR (optional) | Bulk | Rent proxy for cap-rate estimation | Annual |
| OpenStreetMap / Overpass | API | Walkability proxy (`walkabilityScore`), amenity density at ZCTA centroid | On-demand / weekly cache |
| Redfin Market Tracker | Public bulk CSV | Days on market, market PSF, price drops (inventory signals) | Monthly Redfin publish |

### Derived metrics (computed at build)

| Metric | Derivation |
|--------|------------|
| `homePriceForecast1yr` | ZHVI trailing growth trend + FHFA HPI momentum (documented formula) |
| `overvaluationPct` | ZHVI vs income-adjusted fundamental baseline |
| `capRate` | HUD FMR annual / ZHVI (rent-to-value proxy) until property-level rents available |
| `marketPsf` | ZHVI / ACS median sqft where available; metro fallback |
| `sellerDesperationScore` | Derived from Redfin DOM + price-drop signals (`ingest:redfin`) |
| `walkabilityScore` | OSM amenity diversity + density within 1 km of ZCTA centroid (`ingest:osm-walkability`) |
| `capRate` | ACS B25064 median gross rent × 12 / ZHVI (HUD FMR bulk blocked; API path retained) |
| `opportunityScore` | Existing composite over live inputs |

### Explicit bans (unchanged)

- **No scraping** of Zillow listing pages, Realtor.com, or Apartments.com
- **ZHVI only** via [Zillow Research data portal](https://www.zillow.com/research/data/) bulk CSV downloads
- **No paid ATTOM/DataTree** until S010 (Discovery Journey) acceptance criteria met and budget approved

### Mock role (demoted)

- `data/mock/` retained for: local dev without network, CI fixtures, schema examples
- Build scripts (`build:geojson`, `build:us-metros`, `build:us-metro-tiles`) consume **live ingested** `data/ingest/` outputs in production builds
- UI loaders unchanged — swap ingest output paths, not components (ADR-003 consequence preserved)

### Ingest layout

```
data/
  ingest/
    census-acs/       # pulled tables by vintage
    zhvi/             # bulk CSV from Zillow Research (zip, metro, city, …)
    fhfa-hpi/         # bulk CSV
    hud/              # optional FMR
    redfin/           # market tracker CSV (DOM, PSF, price drops)
    osm-walkability/  # Overpass amenity counts per ZCTA
  metros/             # enriched shard output (build from ingest)
  mock/               # dev fixtures only
```

### Ingest scripts (pnpm)

| Script | Output |
|--------|--------|
| `ingest:census-acs` | `data/ingest/census-acs/` — demographics, income, rent |
| `ingest:zhvi` | `data/ingest/zhvi/` — home value index by ZIP/metro |
| `ingest:fhfa-hpi` | `data/ingest/fhfa-hpi/` — metro HPI momentum |
| `ingest:redfin` | `data/ingest/redfin/` — DOM, PSF, price drops |
| `ingest:osm-walkability` | `data/ingest/osm-walkability/` — walkability proxy |
| `build:metro-shard` | Merges ingest into `data/metros/{cbsa}.geojson` |

Sandbox ZIP scope: `ALL_SANDBOX_ZIPS` (68 ZCTAs across four CBSAs — see ADR-013).

### Gate to paid Tier (future ADR)

Commercial property APIs (ATTOM, Redfin Data Center paid tier) unlock only when:

1. S010 journey shipped and user-tested (**met** — E007 closed 2026-07-12)
2. Redistribution license signed
3. Monthly refresh cost approved

Optional cross-check sources (not MVP): Zillow Research DOM/inventory CSVs (T047), Realtor.com inventory CSV (T050).

## Consequences

- E007 S008 tickets T032–T036 implement ingest pipelines, not mock expansion
- New env vars: `CENSUS_API_KEY` (required for ACS ingest), ingest paths; no ATTOM keys yet
- ZHVI attribution required in UI footer / data panel per Zillow Research terms
- Forecast and overvaluation carry **model confidence** metadata when derived (not proprietary Zillow forecast API)
- Property-level comps (E004 valuation) remain mock until paid gate opens

## Alternatives Considered

### A. Keep ADR-003 mock-first

Rejected. User revoked; hybrid journey validation requires real demographic and home-value signal, not hand-tuned JSON.

### B. ATTOM/Zillow API from day one (ADR-003 Tier 3)

Rejected for MVP. Cost and license overhead before journey proof; ZHVI bulk covers home value at ZIP/metro scale for choropleth validation.

### C. Census only, no ZHVI

Rejected. Census lacks home values, cap rate inputs, and forecast proxies at ZIP granularity.

## References

- ADR-003 (superseded)
- ADR-005 — Metric taxonomy
- ADR-011 — Tile + shard build pipeline
- [Zillow Research Data](https://www.zillow.com/research/data/)
- [FHFA House Price Index](https://www.fhfa.gov/DataTools/Downloads/Pages/House-Price-Index-Datasets.aspx)
- [Census ACS](https://www.census.gov/programs-surveys/acs)
