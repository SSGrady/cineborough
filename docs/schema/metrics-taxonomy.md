# Metric Taxonomy

Canonical list of metrics displayed in Cineborough. All metrics must exist here and in `packages/data/src/types.ts` before use in UI.

See [ADR-005](../adr/005-data-schema-metric-taxonomy.md) for the decision record.

## Investor Half — Valuation & Runway Engine

| Key | Label | Unit | Sidebar Category | MVP Source |
|-----|-------|------|------------------|------------|
| `homePriceForecast1yr` | 1-Year Price Forecast | % | Financials | Mock |
| `overvaluationPct` | Over / Undervaluation | % | Financials | Mock |
| `capRate` | Cap Rate | % | Investor Metrics | Mock |
| `daysOnMarket` | Days on Market | days | Market Trends | Mock |
| `sellerDesperationScore` | Seller Desperation Score | 0–100 | Investor Metrics | Mock (derived) |
| `marketPsf` | Market PSF | $/sqft | Financials | Mock |
| `homeValueGrowthYoy` | Home Value Growth YoY | % | Market Trends | Mock |
| `medianHomeValue` | Median Home Value | $ | Financials | Mock |

### Seller Desperation Score (derived)

```
sellerDesperationScore = min(100, (daysOnMarket / 90) * 50 + (priceCutCount * 25))
```

Where `priceCutCount` is the number of list price reductions since original listing.

## Hope-Core Half — Neighborhood Discovery Layer

| Key | Label | Unit | Sidebar Category | MVP Source |
|-----|-------|------|------------------|------------|
| `remoteWorkPct` | Remote Work % | % | Demographics | Mock → Census ACS |
| `homeowners25to44Pct` | Homeowners Age 25–44 | % | Demographics | Mock → Census ACS |
| `populationGrowthRate` | Population Growth Rate | % | Demographics | Mock → Census |
| `medianAge` | Median Age | years | Demographics | Mock → Census ACS |
| `walkabilityScore` | Walkability Score | 0–100 | Urban Fabric | Mock → OSM |
| `collegeDegreeRate` | College Degree Rate | % | Demographics | Mock → Census ACS |

## Composite

| Key | Label | Unit | Formula |
|-----|-------|------|---------|
| `opportunityScore` | Opportunity Index | 0–100 | See [opportunity-index.md](./opportunity-index.md) |

## Sidebar Organization (MVP)

```
Popular Data
├── Opportunity Index (default)
├── Home Value
├── 1-Year Price Forecast
├── Overvalued %
└── Cap Rate

Investor Metrics
├── Days on Market
├── Seller Desperation Score
├── Market PSF
└── Home Value Growth YoY

Hope-Core Discovery
├── Remote Work %
├── Homeowners 25–44 %
├── Population Growth
├── Walkability Score
└── College Degree Rate
```

## Property-Level Valuation (Level 3)

See [property-valuation.md](./property-valuation.md) for offer ranges, renovation tiers, calculation breakdown, and comparable sales schema. Mock fixtures in `data/mock/properties.json`.

## Zip-Level Signals Panel (Level 2)

When a ZIP is selected, show two cards:

**Forecast & Valuation (Zip):**
- 1-Year Forecast, Home Value Growth YoY, Over/Undervaluation, Market PSF, % vs market PSF, Market Score

**Demographics & Hope-Core:**
- Remote Work %, Homeowners 25–44 %, Median Age, Walkability Score, Population Growth
