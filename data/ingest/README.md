# Data ingest (ADR-012)

Periodic bulk downloads land here before build scripts join them into metro shards and national tiles.

## ZHVI (Zillow Research)

```bash
pnpm --filter @cineborough/data ingest:zhvi              # metro + zip
pnpm --filter @cineborough/data ingest:zhvi -- --only=metro
```

Outputs:

- `zhvi/raw/*.csv` — downloaded bulk CSVs (gitignored)
- `zhvi/normalized/metro-latest.json` — committed after ingest
- `zhvi/normalized/zip-latest.json` — gitignored (~30k ZIPs; regenerate locally)

## Census ACS (demographics)

Requires free API key: https://api.census.gov/data/key_signup.html

```bash
export CENSUS_API_KEY=your_key
pnpm --filter @cineborough/data ingest:census-acs
pnpm --filter @cineborough/data ingest:census-acs -- --zips=22201,32801
```

Outputs `census-acs/normalized/zip-latest.json` (committed for sandbox ZCTAs after ingest).

## Shard rebuild (joins live ingest)

```bash
pnpm --filter @cineborough/data build:geojson
pnpm --filter @cineborough/data build:orlando-geojson
```

Build scripts overlay Census hope-core + ZHVI home values onto mock financials when normalized ingest files exist.
