# S008 Progress

## Tickets

- [x] **T032** — Census ACS ingest script + shard merge
- [x] **T033** — ZHVI + FHFA bulk ingest
- [x] **T034** — Forecast + overvaluation derived model
- [ ] **T035** — Derived metrics + refresh cron
- [ ] **T036** — Income growth schema + layer

## Blockers

- ~~Financial data path~~
- **ADR-012:** Census ACS + Zillow Research ZHVI bulk + FHFA/HUD derived models

## Notes

- FHFA ingest uses expanded-data metro file; DC CBSA 47900 maps to FHFA MSAD 11694 (Arlington corridor).
- Derived `homePriceForecast1yr` and `overvaluationPct` overlay at shard build when `fhfa-hpi/normalized/metro-latest.json` + ZHVI zip ingest exist.
- Re-run `ingest:census-acs` to populate B19013 median household income for income-adjusted overvaluation (falls back to metro ZHVI ratio).
