# Metric Taxonomy

Canonical list of metrics displayed in Cineborough. All metrics must exist here and in `packages/data/src/types.ts` before use in UI.

See [ADR-005](../adr/005-data-schema-metric-taxonomy.md) for the decision record.

## Investor Half — Valuation & Runway Engine

| Key | Label | Unit | Sidebar Category | MVP Source |
|-----|-------|------|------------------|------------|
| `homePriceForecast1yr` | 1-Year Price Forecast | % | Financials | Derived (ZHVI + FHFA) |
| `overvaluationPct` | Over / Undervaluation | % | Financials | Derived (ZHVI + ACS income) |
| `capRate` | Cap Rate | % | Investor Metrics | Mock |
| `daysOnMarket` | Days on Market | days | Market Trends | Mock |
| `sellerDesperationScore` | Seller Desperation Score | 0–100 | Investor Metrics | Mock (derived) |
| `marketPsf` | Market PSF | $/sqft | Financials | Mock |
| `homeValueGrowthYoy` | Home Value Growth YoY | % | Market Trends | ZHVI bulk |
| `medianHomeValue` | Median Home Value | $ | Financials | ZHVI bulk |

### Seller Desperation Score (derived)

```
sellerDesperationScore = min(100, (daysOnMarket / 90) * 50 + (priceCutCount * 25))
```

Where `priceCutCount` is the number of list price reductions since original listing.

### Derived financial metrics (ADR-012 / T034)

**1-Year Price Forecast (`homePriceForecast1yr`)**

```
forecast = clamp(0.6 × zhviGrowth + 0.4 × fhfaHpiYoy, -15%, +25%)
```

- `zhviGrowth`: ZHVI YoY %; when ≥3 monthly series points exist, averages YoY with trailing 3-month MoM annualized trend
- `fhfaHpiYoy`: FHFA expanded-data metro HPI year-over-year change (sandbox CBSA mapping in `fhfa-hpi-sources.ts`)

**Over / Undervaluation (`overvaluationPct`)**

Primary (when ACS B19013 median household income is present):

```
overvaluationPct = clamp((zipPTI / metroPTI − 1) × 100, -40%, +60%)
zipPTI = zhvi / medianHouseholdIncome
metroPTI = metroZhvi / metroMedianHouseholdIncome
```

Fallback (income unavailable): zip ZHVI premium vs metro ZHVI (`(zhvi / metroZhvi − 1) × 100`).

Model confidence: 0.75 with income, 0.55 with metro ZHVI anchor, 0.45 zip-only.

## Hope-Core Half — Neighborhood Discovery Layer

| Key | Label | Unit | Sidebar Category | MVP Source |
|-----|-------|------|------------------|------------|
| `remoteWorkPct` | Remote Work % | % | Demographics | Census ACS |
| `homeowners25to44Pct` | Homeowners Age 25–44 | % | Demographics | Census ACS |
| `populationGrowthRate` | Population Growth Rate | % | Demographics | Census ACS |
| `medianAge` | Median Age | years | Demographics | Census ACS |
| `walkabilityScore` | Walkability Score | 0–100 | Urban Fabric | Mock → OSM |
| `collegeDegreeRate` | College Degree Rate | % | Demographics | Census ACS |

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
