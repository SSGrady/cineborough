# S006 Progress

## Tickets

- [x] **T027** — `build-us-metro-tiles.ts` (945 CBSAs → GeoJSONL + PMTiles)
- [x] **T028** — MVTLayer national choropleth via PMTiles + GeoJSON fallback
- [x] **T029** — `fetchMetroShard` client loader with cache

## Notes

- tippecanoe: `brew install tippecanoe`
- Build: `pnpm --filter @cineborough/data build:us-metro-tiles`
- Enable tiles: `NEXT_PUBLIC_METRO_TILES_URL=/tiles/us-metros.pmtiles` in `.env.local`
