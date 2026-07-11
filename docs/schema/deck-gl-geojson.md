# Deck.gl GeoJSON Contract

Unified `FeatureCollection` for Cineborough's DC metro sandbox choropleth.  
See [ADR-009](../adr/009-ui-ux-and-geojson-schema.md).

## File

| Path | Role |
|------|------|
| `data/metros/47900.geojson` | Runtime source for Deck.gl `GeoJsonLayer` (DC sandbox) |
| `packages/data/src/build-geojson.ts` | Regenerates file from boundaries + metrics + locale quotes |

## FeatureCollection shape

```typescript
interface DcMetroGeoJson {
  type: "FeatureCollection";
  metadata: {
    metro: string;
    dataAsOf: string;       // ISO date, e.g. "2026-05-01"
    dataAsOfLabel: string;  // Display label, e.g. "May 2026"
    sandboxZips: string[];
    generatedAt: string;
  };
  features: DcMetroFeature[];
}
```

## Feature properties (`DcMetroFeatureProperties`)

Flat camelCase aligned with Deerfield / Reventure enriched GeoJSON:

| Property | Type | Description |
|----------|------|-------------|
| `zipCode` | string | 5-digit ZCTA |
| `neighborhoodName` | string | Display name |
| `state` | string | `VA`, `MD`, or `DC` |
| `medianHomeValue` | number | Median home value (USD) |
| `oneYearForecastPct` | number | 1-year price forecast % |
| `overvaluationPct` | number | Over/undervaluation % |
| `capRatePct` | number | Cap rate % |
| `daysOnMarket` | number | Average days on market |
| `sellerDesperationScore` | number | 0–100 |
| `marketPsf` | number | Market price per sqft |
| `homeValueGrowthYoy` | number | YoY home value growth % |
| `priceCutCount` | number | Optional price-cut signal |
| `remoteWorkPct` | number | Remote work % |
| `homeowners25to44Pct` | number | Homeowners aged 25–44 % |
| `populationGrowthRate` | number | Population growth % |
| `medianAge` | number | Median age (years) |
| `walkScore` | number | Walkability 0–100 |
| `collegeDegreeRate` | number | College degree % |
| `localQuote` | string | Community sentiment quote |
| `primaryVibe` | string | Short neighborhood vibe tag |
| `opportunityScore` | number | Raw Opportunity Index |
| `opportunityScoreNormalized` | number | 0–100 choropleth scale |
| `fillColor` | string | Hex color from opportunity normalization |
| `fillColorRgb` | [number, number, number] | RGB for Deck.gl |
| `labelLng` | number | Label anchor longitude |
| `labelLat` | number | Label anchor latitude |

## Example feature (22201 — Arlington Clarendon)

```json
{
  "type": "Feature",
  "properties": {
    "zipCode": "22201",
    "neighborhoodName": "Arlington (Clarendon)",
    "state": "VA",
    "medianHomeValue": 685000,
    "oneYearForecastPct": 2.1,
    "overvaluationPct": 8.2,
    "capRatePct": 4.8,
    "daysOnMarket": 28,
    "sellerDesperationScore": 22,
    "marketPsf": 612,
    "homeValueGrowthYoy": 3.4,
    "priceCutCount": 0,
    "remoteWorkPct": 38.5,
    "homeowners25to44Pct": 42.1,
    "populationGrowthRate": 1.8,
    "medianAge": 34.2,
    "walkScore": 88,
    "collegeDegreeRate": 72.4,
    "localQuote": "It has better access to green and blue spaces than most big cities though.",
    "primaryVibe": "Walkable nightlife hub",
    "opportunityScore": 32.4,
    "opportunityScoreNormalized": 67.8,
    "fillColor": "#eab308",
    "fillColorRgb": [234, 179, 8],
    "labelLng": -77.096,
    "labelLat": 38.886
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": ["…"]
  }
}
```

## Precomputation rules

### Opportunity score

```
opportunityScore = oneYearForecastPct + remoteWorkPct − overvaluationPct
```

### Normalization

Across all features in the collection:

```
opportunityScoreNormalized = ((opportunityScore − minRaw) / (maxRaw − minRaw)) × 100
```

If `maxRaw === minRaw`, assign `50` to all features.

### Fill color

Map `opportunityScoreNormalized` to stops in [`opportunity-index.md`](./opportunity-index.md):

| Range | Color |
|-------|-------|
| 70–100 | `#22c55e` |
| 40–69 | `#eab308` |
| 0–39 | `#ef4444` |

### Active metric coloring (runtime)

When the user selects a non-opportunity metric in the sidebar, the map layer may override `fillColorRgb` by normalizing that metric across features at runtime. Default layer uses precomputed opportunity colors.

## TypeScript

```typescript
// packages/data/src/types.ts
export interface DcMetroFeatureProperties { /* see table above */ }

export interface DcMetroFeature {
  type: "Feature";
  properties: DcMetroFeatureProperties;
  geometry: GeoJSON.Polygon;
}

export interface DcMetroGeoJson {
  type: "FeatureCollection";
  metadata: DcMetroGeoJsonMetadata;
  features: DcMetroFeature[];
}
```

## Loader

```typescript
import { loadDcMetroGeoJson } from "@cineborough/data";

const collection = loadDcMetroGeoJson();
// Deck.gl: GeoJsonLayer({ data: collection, ... })
```

Legacy `ZipMetrics` consumers should use `zipMetricsFromGeoJson(collection)` adapter until fully migrated.
