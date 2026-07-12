# Nationwide Metro Ingest Pipeline

## Overview

Extends the sandbox ZIP-level shard pipeline (ADR-011 Tier 2) to all U.S. CBSAs with full ZCTA polygon outlines and live metric overlays.

| Layer | Source | Unit |
|-------|--------|------|
| **Metro catalog** | Census `cbsa-boundaries-20m.geojson` (945 CBSAs) | CBSA code |
| **Neighborhood unit** | ZCTA (5-digit ZIP Code Tabulation Area) | Per ADR-004/009 |
| **CBSA ↔ ZCTA map** | Zillow ZHVI zip `metro` field ↔ CBSA `NAME` | 927 metro names, ~26k ZCTAs |
| **Polygon outlines** | Census TIGERweb ZCTA5 layer | `fetch` per ZCTA |
| **Home values** | Zillow Research ZHVI bulk (`ingest:zhvi`) | National zip-latest.json |
| **HPI momentum** | FHFA expanded metro bulk (`ingest:fhfa-hpi`) | 410 metros |
| **Market trends** | Redfin market tracker (`ingest:redfin --all`) | National ZIP TSV |
| **Demographics** | Census ACS (`ingest:census-acs`) | Optional; sandbox only today |
| **Walkability** | OSM Overpass (`ingest:osm-walkability`) | Optional; rate-limited |

### Sandbox override

Four sandbox CBSAs (47900, 36740, 41860, 41940) use **curated ZIP lists** — Orlando keeps all 16 sandbox ZCTAs, not the full 91 ZHVI crosswalk ZCTAs.

## Catalog

```
data/catalog/metro-catalog.json   # CBSA → ZCTA list with counts
data/catalog/progress.json        # Checkpoint tracker (resume-safe)
```

Build catalog:

```bash
pnpm --filter @cineborough/data build:metro-catalog
```

Expected counts (as of 2026-07):
- **945** CBSAs in boundaries file
- **~389** MSAs (LSAD M1), **~556** micropolitan (M2)
- **~850+** metros with ≥1 ZCTA via ZHVI crosswalk
- **~26,000** total ZCTAs across catalog

## Batch ingest

```bash
# 1. Ensure national bulk data (one-time)
pnpm --filter @cineborough/data ingest:zhvi          # metro + zip
pnpm --filter @cineborough/data ingest:fhfa-hpi
pnpm --filter @cineborough/data ingest:redfin -- --all   # ~30k ZIPs, slow TSV scan

# 2. Build catalog
pnpm --filter @cineborough/data build:metro-catalog

# 3. Ingest metros in batches (resume-safe)
pnpm --filter @cineborough/data ingest:nationwide -- --limit=10 --offset=0
pnpm --filter @cineborough/data ingest:nationwide -- --limit=10 --offset=10
pnpm --filter @cineborough/data ingest:nationwide -- --msa-only --limit=50

# Single metro
pnpm --filter @cineborough/data ingest:nationwide -- --cbsa=33100

# Rebuild existing shard
pnpm --filter @cineborough/data ingest:nationwide -- --cbsa=33100 --force

# Status
pnpm --filter @cineborough/data ingest:status
```

### Per-metro pipeline

1. Load CBSA + ZCTA list from catalog
2. Fetch TIGERweb ZCTA polygons → `data/staging/{cbsa}/boundaries.geojson`
3. Seed baseline metrics from ZHVI → `data/staging/{cbsa}/metrics.json`
4. Merge live ingest (ZHVI, FHFA, Redfin) via `merge-shard-metrics.ts`
5. Build enriched shard → `data/metros/{cbsa}.geojson`
6. Update `data/catalog/progress.json`

## Map loading

- **Sandbox metros**: bundled in `metro-shards.ts` (webpack static import)
- **All other metros**: `GET /api/v1/metros/{cbsa}/geojson` reads `data/metros/{cbsa}.geojson` from disk
- **National view**: unchanged — `us-metros-tiles.geojsonl` / PMTiles (ADR-011 Tier 1)

## Data gaps

| Gap | Impact | Mitigation |
|-----|--------|------------|
| HUD ZIP-CBSA crosswalk WAF-blocked | Using ZHVI metro name match instead | Names match exactly for most CBSAs |
| FHFA covers 410 metros | No HPI-derived forecast for ~535 CBSAs | ZHVI-only forecast fallback |
| Census ACS per-ZIP API | Slow at 26k scale | Optional batch; defaults in seed |
| OSM walkability | 2.5s/ZIP Overpass delay | Optional; default walk score in seed |
| Redfin national TSV scan | ~10–20 min one-time | `--all` flag; cached in normalized JSON |

## File layout

```
packages/data/src/
  metro-catalog/          # Catalog types, build, progress, ZHVI lookup
  nationwide/             # Per-metro ingest + batch orchestrator
  scripts/
    build-metro-catalog.ts
    ingest-nationwide.ts
    ingest-status.ts
    build-metro-shard-cli.ts
data/catalog/             # metro-catalog.json, progress.json (committed)
data/staging/{cbsa}/      # Intermediate artifacts (gitignored)
data/metros/{cbsa}.geojson  # Output shards (gitignored except sandbox 4)
```
