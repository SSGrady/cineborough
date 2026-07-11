# Property Valuation Schema

Mock-first property-level valuation data for ADR-006 Level 3 UX. Live ATTOM/DataTree integration requires ADR-003 amendment.

## Data Source

- **Runtime:** `data/mock/properties.json` (sidecar — not embedded in `dc-metro.geojson`)
- **Loader:** `loadMockProperties()` in `@cineborough/data`
- **Types:** `packages/data/src/types.ts`

ZIP-level metrics remain in `dc-metro.geojson`. Property fixtures reference a `zipCode` foreign key to join at render time.

## Property Record

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable slug (`prop-22201-highland`) |
| `address` | string | Street address |
| `city` | string | City name |
| `state` | string | State abbreviation |
| `zipCode` | string | Sandbox ZIP (must exist in dc-metro.geojson) |
| `listPrice` | number | Current list price ($) |
| `bedrooms` | number | Bedroom count |
| `bathrooms` | number | Bathroom count |
| `sqft` | number | Living area (sqft) |
| `lotSqft` | number | Lot size (sqft) |
| `breakdown` | object | Calculation inputs (see below) |
| `offerRangesAsIs` | object | Base offers with renovation tier `off` |
| `comparables` | array | Recent comp sales (see below) |

## Calculation Breakdown

| Field | Type | Description |
|-------|------|-------------|
| `marketPsf` | number | ZIP market $/sqft |
| `similarHomesPsf` | number | Weighted comp $/sqft |
| `forecastAdjustedValue` | number | Forecast-adjusted market value ($) |
| `purchaseTrendValue` | number | Purchase-trend adjusted value ($) |

## Offer Ranges (as-is)

| Field | Type | Description |
|-------|------|-------------|
| `conservative` | number | Low-confidence offer ($) |
| `fair` | number | Balanced offer ($) |
| `competitive` | number | Aggressive offer ($) |

Percent vs list is computed at render: `(offer - listPrice) / listPrice * 100`.

## Renovation Tiers

| Tier ID | Label | Cost/sqft |
|---------|-------|-----------|
| `off` | Off (as-is) | $0 |
| `light` | Light | $35 |
| `full` | Full | $65 |
| `stud` | Stud | $100 |

Renovation adjustment subtracts `costPerSqft × sqft` from each offer tier (buyer reserves reno budget).

## Comparable Sale

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Comp address |
| `price` | number | Sale/list price ($) |
| `bedrooms` | number | Bedrooms |
| `bathrooms` | number | Bathrooms |
| `sqft` | number | Living area |
| `lotSqft` | number | Lot size |
| `pricePerSqft` | number | $/sqft |
| `status` | string | `Sold`, `Pending`, `Active` |

## Primary Test Fixture (22201)

`prop-22201-highland` — 1230 N Highland St, list $349,900:

| Tier | Offer | vs List |
|------|-------|---------|
| Conservative | $292,000 | -16.55% |
| Fair | $307,000 | -12.26% |
| Competitive | $316,000 | -9.69% |

## UI Integration (Level 3)

1. User selects ZIP at Level 2
2. ZIP detail shows "Evaluate property" CTA + property chips filtered by `zipCode`
3. Property selection opens `PropertyValuationPanel` with offer cards, renovation pills, breakdown, comps table
