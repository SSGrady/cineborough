# ADR 005: Data Schema and Metric Taxonomy

## Status

Accepted

## Date

2026-07-08

## Context

The target user needs both investor-grade financial signals and hope-core neighborhood indicators. The sidebar must organize these into two complementary halves without overwhelming the MVP.

## Decision

### Investor Half (Valuation & Runway Engine)

| Metric | Type | Source (MVP) | Purpose |
|--------|------|--------------|---------|
| `homePriceForecast1yr` | `number` (%) | Mock | 1-year localized price forecast |
| `overvaluationPct` | `number` (%) | Mock | Over/undervaluation vs market |
| `capRate` | `number` (%) | Mock | Investment yield indicator |
| `daysOnMarket` | `number` | Mock | Market velocity |
| `sellerDesperationScore` | `number` (0–100) | Mock | Derived from DOM + price cuts |
| `marketPsf` | `number` ($) | Mock | ZIP median price per sqft |
| `listingPsf` | `number` ($) | Mock | Subject property PSF (Phase 3) |
| `homeValueGrowthYoy` | `number` (%) | Mock | Year-over-year appreciation |

### Hope-Core Half (Neighborhood Discovery Layer)

| Metric | Type | Source (MVP) | Purpose |
|--------|------|--------------|---------|
| `remoteWorkPct` | `number` (%) | Mock → Census ACS | Lifestyle flexibility indicator |
| `homeowners25to44Pct` | `number` (%) | Mock → Census ACS | Peer-group ownership signal |
| `populationGrowthRate` | `number` (%) | Mock → Census | Future demand indicator |
| `medianAge` | `number` | Mock → Census ACS | Community age profile |
| `walkabilityScore` | `number` (0–100) | Mock → OSM | 15-minute city proxy |
| `collegeDegreeRate` | `number` (%) | Mock → Census ACS | Education density |

### Composite Metric

**Opportunity Index** (see `docs/schema/opportunity-index.md`):

```
opportunityScore = homePriceForecast1yr + remoteWorkPct − overvaluationPct
```

Normalized to 0–100 for choropleth color scale.

### Type Location

All types defined in `packages/data/src/types.ts`. Schema docs in `docs/schema/`.

## Consequences

- UI sidebar groups metrics under "Investor" and "Hope-Core" categories.
- Adding a new metric requires updating types, schema docs, and mock data.
- Opportunity Index is the default map layer on landing.

## Alternatives Considered

- **Flat metric list (Reventure-style)** — rejected; misses the hybrid thesis organization.
- **20+ metrics in MVP** — rejected; 14 metrics across two halves is the ceiling for Phase 1.
