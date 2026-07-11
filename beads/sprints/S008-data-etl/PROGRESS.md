# S008 Progress

## Tickets

- [x] **T032** — Census ACS ingest script + shard merge
- [x] **T033** — ZHVI + FHFA bulk ingest
- [x] **T034** — Forecast + overvaluation derived model
- [x] **T035** — Derived metrics + refresh cron (shard merge overlays live ingest)
- [x] **T036** — Income growth schema + layer (ACS B19013 YoY in ingest + sidebar)

## Blockers

- ~~Financial data path~~
- **ADR-012:** Census ACS + Zillow Research ZHVI bulk + FHFA/HUD derived models

## Notes

- FHFA ingest uses expanded-data metro file; DC CBSA 47900 maps to FHFA MSAD 11694 (Arlington corridor).
- Derived `homePriceForecast1yr` and `overvaluationPct` overlay at shard build when `fhfa-hpi/normalized/metro-latest.json` + ZHVI zip ingest exist.
- Re-run `ingest:census-acs` to populate B19013 median household income for income-adjusted overvaluation (falls back to metro ZHVI ratio).
- Sandbox expanded: DC 18 ZIPs, Orlando 16 ZIPs (TIGERweb ZCTA boundaries + live ACS/ZHVI/FHFA merge).
- Cap rate proxy wired via ACS B25064 median gross rent / ZHVI at shard build (HUD bulk CSV blocked by WAF; `ingest:hud-fmr` retained for API path).
- Metric-aware map legend: value metrics use blue→red gradient with min/max; opportunity index uses green/yellow/red terciles.

## Research (2026-07-11)

Monthly metrics source evaluation: [`docs/research/monthly-metrics-data-sources.md`](../../../docs/research/monthly-metrics-data-sources.md)

**Recommended next ingest tickets** (not yet filed — create before implementation):

| ID | Title | Priority | Unblocks |
|----|-------|----------|----------|
| **T046** | Redfin market tracker bulk ingest (DOM, PSF, inventory, price drops) | P1 | `daysOnMarket`, `marketPsf`, seller-desperation inputs |
| **T047** | Zillow Research market metrics ingest (DOM, price cuts, inventory) | P2 | Cross-check + seller-desperation inputs |
| **T048** | OSM/Overpass walkability proxy at ZCTA centroid | P1 | `walkabilityScore` |
| **T049** | Derived `sellerDesperationScore` from live market signals | P1 | Investor Metrics sidebar (depends T046) |
| **T050** | Realtor.com monthly inventory CSV ingest (optional fallback) | P3 | List-side DOM/PSF/decrease counts |

**MVP slice:** T046 → T049 → T048 (~7–11 dev days). T047/T050 optional cross-checks.

**Deferred (ADR-012 paid gate):** ATTOM property-level DOM/PSF/cuts; CoreLogic microdata; Walk Score Enterprise bulk.
