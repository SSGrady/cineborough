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

Attribution required in UI: see `ZHVI_ATTRIBUTION` in `packages/data/src/ingest/zhvi-sources.ts`.
