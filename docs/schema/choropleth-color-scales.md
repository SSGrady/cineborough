# Choropleth Color Scales

Legend and fill-color semantics for map metric layers. Implementation: `packages/geo/src/color-scales.ts`, normalization: `packages/data/src/metric-utils.ts`.

See ADR-009 (UI contract) and [opportunity-index.md](./opportunity-index.md).

## Normalization strategies

| Strategy | Metrics | Behavior |
|----------|---------|----------|
| **Fixed thresholds** | `medianHomeValue`, `homePriceForecast1yr` | Absolute dollar / percent buckets; not data-driven |
| **Data-driven terciles** | Most hope-core / investor metrics | p33 / p66 computed across loaded ZIPs in view |
| **Min–max gradient** | `marketPsf` | Blue→red Reventure-style gradient on normalized 0–100 |
| **Precomputed normalized** | `opportunityScore` | 0–100 from raw formula; fixed color stops |

## Fixed thresholds

### Median home value

Buyer-semantics buckets (blue tint = more affordable):

| Raw value | Normalized score | Color | Legend label |
|-----------|------------------|-------|--------------|
| < $315,000 | 85 | Blue tint (`#6BA3D6`) | More affordable |
| $315,000 – $600,000 | 55 | White tint (`#F0EDE6`) | Middle range |
| > $600,000 | 20 | Red | Higher cost |

Constants: `HOME_VALUE_COLOR_THRESHOLDS` in `opportunity-index.ts`.

### 1-year price forecast

| Raw value | Normalized score | Color | Legend label |
|-----------|------------------|-------|--------------|
| < 0% | 20 | Red | Declining |
| 0% – 2.9% | 55 | White tint (`#F0EDE6`) | Moderate |
| ≥ 3% | 85 | Blue tint (`#6BA3D6`) | Strong growth |

Constants: `FORECAST_COLOR_THRESHOLDS` in `opportunity-index.ts`.

## Opportunity index (fixed stops on normalized score)

| Range | Color | Meaning |
|-------|-------|---------|
| 70–100 | `#6BA3D6` (blue tint) | High opportunity |
| 40–69 | `#F0EDE6` (white tint) | Moderate |
| 0–39 | `#ef4444` | Low / caution |

## Tercile metrics (default)

For metrics without fixed thresholds, legend labels show computed p33/p66 bounds when available (`tercileBounds` prop on `ColorLegend` / `BottomBar`). `medianAge` inverts semantics (younger = blue tint).

## Non-goals

- Do not switch `medianHomeValue` or `homePriceForecast1yr` to data-driven terciles without ADR amendment (Reventure parity).
- National metro tiles use separate precomputed colors; this doc applies to sandbox ZIP choropleth.
