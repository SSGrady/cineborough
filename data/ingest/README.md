# Data ingest (ADR-012)

Periodic bulk downloads land here before build scripts join them into metro shards and national tiles.

## ZHVI (Zillow Research)

```bash
pnpm --filter @cineborough/data ingest:zhvi              # metro + zip
pnpm --filter @cineborough/data ingest:zhvi -- --only=metro
pnpm --filter @cineborough/data ingest:zhvi -- --only=zip
```

Outputs:

- `zhvi/raw/*.csv` — downloaded bulk CSVs (gitignored)
- `zhvi/normalized/metro-latest.json` — committed after ingest
- `zhvi/normalized/zip-latest.json` — gitignored (~30k ZIPs; regenerate locally)

Attribution: Zillow Research ZHVI bulk data (© Zillow).

## Census ACS (demographics)

Requires free API key: https://api.census.gov/data/key_signup.html

```bash
export CENSUS_API_KEY=your_key
pnpm --filter @cineborough/data ingest:census-acs
pnpm --filter @cineborough/data ingest:census-acs -- --zips=22201,32801
```

Outputs `census-acs/normalized/zip-latest.json` (committed for sandbox ZCTAs after ingest).

Includes hope-core demographics plus optional B19013 median household income for derived overvaluation.

## FHFA House Price Index

Official bulk download from fhfa.gov — no API key required.

```bash
pnpm --filter @cineborough/data ingest:fhfa-hpi
```

Outputs:

- `fhfa-hpi/raw/hpi_exp_metro.txt` — downloaded bulk file (gitignored)
- `fhfa-hpi/normalized/metro-latest.json` — sandbox CBSAs 47900 (DC) and 36740 (Orlando)

DC sandbox maps CBSA 47900 → FHFA MSAD 11694 (Arlington-Alexandria-Reston) per ADR-012.

## Redfin market tracker (DOM, PSF, price drops)

```bash
pnpm --filter @cineborough/data ingest:redfin
pnpm --filter @cineborough/data ingest:redfin -- --zips=22201,32801
```

Outputs:

- `redfin/raw/zip_code_market_tracker.tsv000.gz` — downloaded bulk TSV (gitignored)
- `redfin/normalized/zip-latest.json` — latest rolling window per sandbox ZCTA

Filters `All Residential` rows; keeps latest `period_end` per ZIP. Current S3 dump uses 90-day rolling windows.

Attribution: Redfin Data Center bulk download.

## OSM walkability proxy

```bash
pnpm --filter @cineborough/data ingest:osm-walkability
pnpm --filter @cineborough/data ingest:osm-walkability -- --zips=22201,32801
pnpm --filter @cineborough/data ingest:osm-walkability -- --no-cache
```

Requires `data/mock/zip-boundaries.geojson` for DC sandbox ZIPs; Orlando ZIPs fall back to live TIGERweb centroid lookup.

Outputs:

- `osm-walkability/raw/overpass/{zip}.json` — cached Overpass responses (gitignored)
- `osm-walkability/normalized/zip-latest.json` — 0–100 walkability score per sandbox ZCTA

Attribution: OpenStreetMap © contributors (ODbL).

## Shard rebuild (joins live ingest)

```bash
pnpm --filter @cineborough/data build:geojson
pnpm --filter @cineborough/data build:orlando-geojson
```

Build scripts overlay Census hope-core, ZHVI home values, Redfin market trends, OSM walkability, derived seller desperation, and derived forecast/overvaluation (ZHVI + FHFA + ACS income when present) onto mock financials when normalized ingest files exist.
