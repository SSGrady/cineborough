# ADR 011: National Metro Tile Strategy (3,100+ CBSAs)

## Status

Accepted

## Date

2026-07-11

## Context

ADR-010 defined geography-level cameras and deferred national data ingest. Since then:

- **National choropleth** ships with 58 tier-1/2 metros via `us-metros.geojson` (Census CBSA 20m polygons + mock metrics)
- **Sandbox shards** ship for DC (`47900`, 5 ZIPs) and Orlando (`36740`, 4 ZIPs) via `loadMetroShardsGeoJson()`
- Deck.gl `GeoJsonLayer` renders enriched `FeatureCollection` blobs client-side

Scaling to **~3,142 U.S. metropolitan and micropolitan statistical areas** (Census CBSA count) and eventually **~33,000 ZCTAs** requires a deliberate delivery strategy. Loading one monolithic enriched GeoJSON for all metros fails on bundle size, parse time, and memory.

This ADR compares three delivery models and picks a phased hybrid.

## Decision

### Three delivery models compared

| Criterion | Enriched GeoJSON shards | Vector tiles (PMTiles / Mapbox MVT) | API on-demand |
|-----------|-------------------------|-------------------------------------|---------------|
| **Initial load** | Medium — fetch N shards or one national summary | Low — style + tile metadata only | Lowest — empty map until request |
| **Full national polygon coverage** | Poor — 3,100 × enriched polygons ≈ 15–40 MB gzipped | **Best** — streamed by zoom/viewport | Good — one CBSA per request |
| **Metric updates** | Rebuild + redeploy JSON | Rebuild tileset or join live API at query time | **Best** — swap API response, no redeploy |
| **Deck.gl integration** | Native `GeoJsonLayer` (current) | `MVTLayer` or Mapbox fill layer + join | Fetch → `GeoJsonLayer` per shard |
| **Choropleth property join** | Precomputed at build (`fillColorRgb`) | Requires tile property schema or GPU expression | Compute client-side or server-side |
| **ZIP drill-down** | Natural shard boundary (`{cbsa}.geojson`) | Separate ZCTA tileset or shard fallback | `GET /metros/{cbsa}/zips` |
| **Offline / CDN cache** | Easy (`Cache-Control` on static JSON) | **Best** (immutable tile pyramids) | Depends on API cache headers |
| **Ops complexity** | Low | Medium (tippecanoe, tile hosting) | Medium (API + auth + rate limits) |

**Verdict:** No single model wins all zoom levels. Use a **hybrid by geography level**.

### Phased hybrid architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  National view (zoom 3–6)                                         │
│  → PMTiles / MVT choropleth (all CBSAs, metric in tile props)    │
│  → Fallback today: us-metros.geojson (58 metros, mock)           │
├─────────────────────────────────────────────────────────────────┤
│  State / regional pan (zoom 6–8)                                  │
│  → Same tile layer; filter by state FIPS in client or server      │
├─────────────────────────────────────────────────────────────────┤
│  Metro sandbox (zoom 9–12)                                        │
│  → Enriched GeoJSON shard per CBSA (`data/metros/{cbsa}.geojson`)│
│  → loadMetroShardsGeoJson() merges active shards; grow catalog    │
├─────────────────────────────────────────────────────────────────┤
│  ZIP detail (zoom 12+)                                            │
│  → On-demand shard fetch when CBSA not in bundle                 │
│  → `GET /api/v1/metros/{cbsa}/geojson` returns enriched FC       │
└─────────────────────────────────────────────────────────────────┘
```

### Tier 1 — National summary (current → tile migration)

**Now:** `data/mock/us-metros.geojson` — 58 metros, Census 20m polygons, metrics from `us-metro-metrics.json`. Built by `build-us-metros.ts`. ~1 MB JSON.

**At 3,100 metros:** Replace with **vector tile layer**:

1. Source: Census `cb_20xx_us_cbsa_20m` (or 5m for zoom ≥ 6)
2. Build: `tippecanoe` → PMTiles hosted on CDN (Cloudflare R2 / S3)
3. Properties per feature: `GEOID`, `NAME`, + flat metric fields matching `DcMetroFeatureProperties` subset
4. Render: Deck.gl `MVTLayer` with `getFillColor` from `fillColorRgb` tile property OR client-side color scale from raw metric
5. Keep `us-metro-metrics.json` as build input; tile build script joins metrics → geometries

**Why not one big GeoJSON:** 3,142 MultiPolygons with 20+ metric properties ≈ 25 MB+ raw JSON; parse blocks main thread; exceeds sensible Next.js static import budget.

### Tier 2 — Metro shards (current pattern, scale catalog)

**Now:** `dc-metro.geojson`, `orlando-metro.geojson`; `metro-shards.ts` merges for map display; `build-metro-shard.ts` shared builder.

**Scale path:**

```
data/
  metros/
    47900.geojson    # DC sandbox (5 ZIPs)
    36740.geojson    # Orlando sandbox (4 ZIPs)
    {cbsa}.geojson   # future: full ZIP choropleth per MSA
  mock/
    us-metros.geojson          # national summary (until tiles)
    cbsa-boundaries-20m.geojson # build input
```

- **Hot metros** (top 100 by traffic): pre-built shards in repo or CDN
- **Long tail:** API on-demand fetch on national metro click (already wired for DC/Orlando CBSA codes)
- Shard contract unchanged from ADR-009 (`DcMetroGeoJson` + `cbsaCode` metadata)

### Tier 3 — API on-demand (ZIP + long-tail metros)

For CBSAs without a pre-built shard:

```
GET /api/v1/metros/{cbsa}/geojson
  → 200 FeatureCollection (enriched, same schema as shard)
  → 404 { "fallback": "national-tile-only" }
```

- Client caches responses in memory + `sessionStorage` keyed by CBSA
- National click handler: try `loadMetroShard(cbsa)` → else `fetchMetroShard(cbsa)` → fly camera
- Rate limit: 60 req/min per IP; shards immutable with `ETag` from `generatedAt`

**When to fetch vs bundle:** Bundle if CBSA ∈ sandbox list or top-100 table; else API.

### Metric refresh pipeline

| Layer | Refresh cadence | Mechanism |
|-------|-----------------|-----------|
| National tiles | Monthly | Re-run `build-us-metro-tiles` from ATTOM/Census ETL output |
| Sandbox shards | Weekly (mock) / daily (live) | `pnpm build:geojson` per metro |
| Live API | Real-time optional | Server joins DB metrics onto cached geometry |

Precomputed `fillColorRgb` remains the default for Deck.gl perf; dynamic metrics use `getNormalizedMetricValuesFromGeoJson` path (already in `MapView`).

### Zoom-level source selection (client)

| Geography toggle | Zoom | Data source |
|------------------|------|-------------|
| National | 3–6 | MVT national layer (or `us-metros.geojson` fallback) |
| State | 6–8 | MVT filtered by state |
| Metro | 9–11 | Merged shards in viewport + active CBSA shard |
| County | 10–12 | County tile layer (future) or shard subset |
| Zip | 12+ | Active metro shard only |

## Consequences

- **Keep** enriched GeoJSON shard pattern for sandbox ZIP choropleth — proven with DC + Orlando (T025)
- **Migrate** national 58-metro view to PMTiles before adding remaining ~3,084 CBSAs
- **Add** `packages/data/src/metro-tiles.ts` loader stub pointing at CDN URL (env `NEXT_PUBLIC_METRO_TILES_URL`)
- **Do not** merge all CBSAs into one `us-metros.geojson` — cap national GeoJSON at ~100 metros for dev fallback only
- ADR-010 "DC sandbox ZIPs only at national" is **superseded** for national view (58 metros live); ZIP sandbox still DC+Orlando until shard catalog grows
- Epic E005 T026 complete; tile implementation becomes new epic (E006 suggested)

## Alternatives Considered

### A. Single enriched GeoJSON for all 3,100 metros

Rejected. Bundle size, parse latency, and Deck.gl upload cost scale linearly with feature count. Acceptable for ≤100 features (dev), not production national.

### B. Vector tiles only (no GeoJSON shards)

Rejected for ZIP drill-down. MVT at zoom 12+ lacks enriched locale quotes, property panels, and per-ZIP story UX without duplicating shard data in tile properties (width limits ~64KB/tile).

### C. API-only (no static shards or tiles)

Rejected for national view. First paint would require hundreds of parallel requests or one large API response — worse than tile pyramid for choropleth at zoom 4.

### D. Mapbox Enterprise Boundaries product

Deferred. Cost and vendor lock for CBSA/ZCTA; Census cartographic boundaries + tippecanoe sufficient for mock-first phase (ADR-003).

## Implementation checklist (follow-on work)

- [ ] `build-us-metro-tiles.ts` — tippecanoe pipeline from `cbsa-boundaries-20m.geojson` + metrics
- [ ] `MVTLayer` branch in `MapView` when `geographyLevel === "national"` and tiles URL set
- [ ] `fetchMetroShard(cbsa)` client loader with cache
- [ ] Move shard files to `data/metros/{cbsa}.geojson` layout
- [ ] Env: `NEXT_PUBLIC_METRO_TILES_URL`, `METRO_API_BASE_URL`

## References

- ADR-009 — Unified GeoJSON / `DcMetroFeatureProperties`
- ADR-010 — Geography cameras and interaction model
- `packages/data/src/metro-shards.ts` — multi-shard merge loader
- `packages/data/src/build-us-metros.ts` — national 58-metro build
- Census cartographic CBSA: `cb_20xx_us_cbsa_20m` (~945 KB for 945 CBSAs simplified)
