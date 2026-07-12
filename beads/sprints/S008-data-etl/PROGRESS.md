# S008 Progress

## Tickets

- [x] **T032** — Census ACS ingest script + shard merge
- [x] **T033** — ZHVI + FHFA bulk ingest
- [x] **T034** — Forecast + overvaluation derived model
- [x] **T035** — Derived metrics + refresh cron (shard merge overlays live ingest)
- [x] **T036** — Income growth schema + layer (ACS B19013 YoY in ingest + sidebar)
- [x] **T046** — Redfin market tracker bulk ingest (DOM, PSF, price drops)
- [x] **T048** — OSM/Overpass walkability proxy at ZCTA centroid
- [x] **T049** — Derived `sellerDesperationScore` from live market signals
- [x] **T056** — SF Bay sandbox live ingest + FHFA MSAD proxy
- [ ] **T047** — Zillow Research market metrics ingest (optional cross-check)
- [ ] **T050** — Realtor.com monthly inventory CSV ingest (optional fallback)

## Blockers

- ~~Financial data path~~
- **ADR-012:** Census ACS + Zillow Research ZHVI bulk + FHFA/HUD derived models

## Notes

- FHFA ingest uses expanded-data metro file; DC CBSA 47900 maps to FHFA MSAD 11694 (Arlington corridor).
- Derived `homePriceForecast1yr` and `overvaluationPct` overlay at shard build when `fhfa-hpi/normalized/metro-latest.json` + ZHVI zip ingest exist.
- Re-run `ingest:census-acs` to populate B19013 median household income for income-adjusted overvaluation (falls back to metro ZHVI ratio).
- Sandbox expanded: DC 18 ZIPs, Orlando 16 ZIPs, **SF Bay 18 ZIPs** (TIGERweb ZCTA boundaries + live ACS/ZHVI/FHFA/Redfin/OSM merge).
- Cap rate proxy wired via ACS B25064 median gross rent / ZHVI at shard build (HUD bulk CSV blocked by WAF; `ingest:hud-fmr` retained for API path).
- Metric-aware map legend: value metrics use blue→red gradient with min/max; opportunity index uses green/yellow/red terciles.
- **T046/T049:** Redfin `ingest:redfin` → `daysOnMarket`, `marketPsf`, derived `sellerDesperationScore` (DOM + `price_drops` proxy). Provenance: Redfin live, seller desperation derived.
- **T048:** `ingest:osm-walkability` → `walkabilityScore` from amenity density + diversity within 1 km. Provenance: OSM live with © attribution.

## Research (2026-07-11)

Monthly metrics source evaluation: [`docs/research/monthly-metrics-data-sources.md`](../../../docs/research/monthly-metrics-data-sources.md)

- **T056:** SF Bay sandbox live ingest complete — 52 sandbox ZIPs in census/zhvi/redfin bundles; FHFA MSAD 41884 proxy for CBSA 41860 derived forecast/overvaluation.

**MVP slice complete:** T046 → T049 → T048 → **T056 (SF Bay)**. Optional cross-checks: T047, T050.

**Deferred (ADR-012 paid gate):** ATTOM property-level DOM/PSF/cuts; CoreLogic microdata; Walk Score Enterprise bulk.
