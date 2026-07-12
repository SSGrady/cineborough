# Opportunity Index

The default map layer for Cineborough. Scores regions where economic upside intersects with livable, modern neighborhoods.

See [ADR-005](../adr/005-data-schema-metric-taxonomy.md).

## Formula

```
rawScore = homePriceForecast1yr + remoteWorkPct − overvaluationPct
```

### Example

| ZIP | Forecast | Remote Work % | Overvaluation % | Raw Score |
|-----|----------|---------------|-----------------|-----------|
| 22201 | +2.1% | 38.5% | 8.2% | 32.4 |
| 22204 | −1.5% | 22.0% | −3.1% | 23.6 |
| 20001 | −4.2% | 41.0% | 14.1% | 22.7 |

Higher raw score = more opportunity (growth potential + lifestyle fit − bubble risk).

## Normalization (Choropleth Color Scale)

For the 5-ZIP MVP sandbox, normalize raw scores to 0–100:

```
normalized = ((rawScore - minRaw) / (maxRaw - minRaw)) * 100
```

Where `minRaw` and `maxRaw` are computed across all loaded ZIPs.

### Color Mapping

| Range | Color | Meaning |
|-------|-------|---------|
| 70–100 | `#2563EB` (blue tint) | High opportunity |
| 40–69 | `#F5D547` (yellow tint) | Moderate opportunity |
| 0–39 | `#ef4444` (red) | Low opportunity / caution |

Colors defined in `packages/geo/src/color-scales.ts`.

## Implementation

```typescript
// packages/data/src/opportunity-index.ts
export function computeOpportunityScore(zip: ZipMetrics): number {
  return zip.homePriceForecast1yr + zip.remoteWorkPct - zip.overvaluationPct;
}

export function normalizeScores(scores: number[]): number[] {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return scores.map(() => 50);
  return scores.map((s) => ((s - min) / (max - min)) * 100);
}
```

## Future Refinements (Post-MVP)

- Weighted formula with configurable coefficients
- Population growth as a positive factor
- Walkability as a tiebreaker
- Time-decay on forecast confidence

Any formula change requires an ADR amendment.
