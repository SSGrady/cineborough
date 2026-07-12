# Metric Taxonomy

Canonical list of metrics displayed in Cineborough. All metrics must exist here and in `packages/data/src/types.ts` before use in UI.

See [ADR-005](../adr/005-data-schema-metric-taxonomy.md) for the decision record.

## Investor Half — Valuation & Runway Engine

| Key | Label | Unit | Sidebar Category | MVP Source |
|-----|-------|------|------------------|------------|
| `homePriceForecast1yr` | 1-Year Price Forecast | % | Financials | Derived (ZHVI + FHFA) |
| `overvaluationPct` | Over / Undervaluation | % | Financials | Derived (ZHVI + ACS income) |
| `capRate` | Cap Rate | % | Investor Metrics | Derived (ACS B25064 rent / ZHVI) |
| `daysOnMarket` | Days on Market | days | Market Trends | Redfin bulk (sandbox) |
| `sellerDesperationScore` | Seller Desperation Score | 0–100 | Investor Metrics | Derived (Redfin DOM + price drops) |
| `marketPsf` | Market PSF | $/sqft | Financials | Redfin bulk (sandbox) |
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

**National / metro overview (`build-us-metros.ts`)**

- `medianHomeValue`, `homeValueGrowthYoy`: ZHVI metro bulk (`metro-latest.json`) matched to CBSA by primary city + state
- `homePriceForecast1yr`: derived from ZHVI YoY (+ FHFA HPI when CBSA present in `fhfa-hpi/normalized/metro-latest.json`)
- `overvaluationPct`: metro ZHVI vs US national ZHVI (income-based when ACS available at ZIP level in sandbox shards)
- `opportunityScore`: recomputed from live forecast + mock `remoteWorkPct` baseline until metro ACS ingest
- Still mock at metro overview: cap rate, DOM, seller desperation, PSF, walkability, hope-core demographics (except sandbox ZIP shards)

## Hope-Core Half — Neighborhood Discovery Layer

| Key | Label | Unit | Sidebar Category | MVP Source |
|-----|-------|------|------------------|------------|
| `remoteWorkPct` | Remote Work % | % | Demographics | Census ACS |
| `homeowners25to44Pct` | Homeowners Age 25–44 | % | Demographics | Census ACS |
| `populationGrowthRate` | Population Growth Rate | % | Demographics | Census ACS |
| `incomeGrowthRate` | Income Growth Rate | % | Demographics | Census ACS (B19013 YoY) |
| `medianAge` | Median Age | years | Demographics | Census ACS |
| `walkabilityScore` | Walkability Score | 0–100 | Urban Fabric | OSM proxy (sandbox) |
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

## Taxonomy v2 — WMIL Categories (T074 / ADR-014)

Display labels and sidebar/wish categories reorganized for Where Might I Live parity. Metric keys unchanged; `incomeGrowthRate` remains hidden from `METRIC_LAYERS` and discovery filters.

| Category | Metrics | Display label changes |
|----------|---------|----------------------|
| **Demographics** | `medianAge`, `populationGrowthRate`, `remoteWorkPct`, `homeowners25to44Pct` | — |
| **Market & Economics** | `opportunityScore`, `medianHomeValue`, `homePriceForecast1yr`, `capRate`, `daysOnMarket`, `homeValueGrowthYoy` | `medianHomeValue` → Median Home Price; `homePriceForecast1yr` → 1-Yr Price Forecast; `homeValueGrowthYoy` → Home Value Growth |
| **Lifestyle & Walkability** | `walkabilityScore` | Walkability Score → Walk Score |
| **Investor Signals** | `overvaluationPct`, `sellerDesperationScore`, `marketPsf` | Overvalued % → Overvaluation %; Seller Urgency → Seller Motivation |
| **Education & Schools** | `collegeDegreeRate` | College Degree Rate → Education Level; School Rating placeholder (T075) |

`METRIC_LAYERS` entries include optional `criterionCategory` (defaults to `category`). Choropleth sidebar and discovery add-criterion picker use distinct category systems from `packages/data/src/types.ts`.

## Property-Level Valuation (Level 3)

See [property-valuation.md](./property-valuation.md) for offer ranges, renovation tiers, calculation breakdown, and comparable sales schema. Mock fixtures in `data/mock/properties.json`.

## Zip-Level Signals Panel (Level 2)

When a ZIP is selected, show two cards:

**Forecast & Valuation (Zip):**
- 1-Year Forecast, Home Value Growth YoY, Over/Undervaluation, Market PSF, % vs market PSF, Market Score

**Demographics & Hope-Core:**
- Remote Work %, Homeowners 25–44 %, Median Age, Walkability Score, Population Growth
