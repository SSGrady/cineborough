# S007 Progress

## Tickets

- [x] **T030** — Shard files moved to `data/metros/{cbsa}.geojson`; build scripts + loaders updated
- [x] **T031** — `GET /api/v1/metros/{cbsa}/geojson` route; `fetchMetroShard` local API fallback

## Notes

- Local API serves bundled shards (47900, 36740); unknown CBSAs return `{ "fallback": "national-tile-only" }`
- `fetchMetroShard` resolves API base: explicit option → `NEXT_PUBLIC_METRO_API_BASE_URL` → `/api/v1`
