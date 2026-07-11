# Monthly Metrics Data Sources (2026)

Research for Cineborough investor/hope-core metrics that still rely on mock data after S008 (T032–T036). Scope: **free or cheap (<$100/mo) sources** with **monthly refresh** capability, consistent with [ADR-012](../adr/012-public-bulk-data-ingest.md).

**Already ingested:** Census ACS (hope-core demographics, income, rent), Zillow Research ZHVI, FHFA HPI.

**Explicit bans (unchanged):** No scraping of Zillow/Realtor listing pages; ZHVI and other Zillow Research metrics via bulk CSV only; no ATTOM until S010 gate.

---

## Executive summary

| Metric | Top recommendation | Cost | Fit | Est. effort |
|--------|-------------------|------|-----|-------------|
| Days on Market | **Redfin Data Center** (primary) + Zillow Research DOM bulk (cross-check) | Free | 5/5 | 2–3 days |
| Market PSF | **Redfin Data Center** `median_ppsf` (primary); Realtor.com list PSF (secondary) | Free | 4/5 | 1–2 days |
| Walkability score | **OSM/Overpass amenity proxy** at ZCTA centroid (ADR-012 path) | Free | 3/5 | 4–6 days |
| Seller desperation | **Derived** from Redfin + Zillow bulk (DOM, price drops, inventory, months of supply) | Free | 4/5 | 2–3 days |

**Recommended MVP stack:** One **Redfin market-tracker ingest** covers DOM, PSF, inventory, and price-drop inputs for seller desperation. Add **Zillow Research** DOM/price-cut/inventory CSVs as a second source for cross-validation (same ingest pattern as ZHVI). Build **OSM walkability** as a separate quarterly/weekly-cached batch job. Defer Walk Score API, ATTOM, and CoreLogic until paid gate.

---

## Comparison matrix (all evaluated sources)

| Source | Metrics | Cost | Format | Coverage | Cadence | License / redistribution | 2026 vintage | Fit (1–5) |
|--------|---------|------|--------|----------|---------|--------------------------|--------------|-----------|
| **Redfin Data Center** | DOM, PSF, inventory, price drops, sale/list prices | **Free** | Gzipped TSV (S3) | National → ZIP, city, county, metro, neighborhood | Monthly (~3rd week); weekly rolling windows also available | [Terms of Use](https://www.redfin.com/about/terms-of-use); display with attribution; bulk download permitted for research/analysis — verify before commercial resale | Active; S3 bucket updated monthly | **5** |
| **Realtor.com Research** | DOM, list PSF, price decrease count, inventory, hotness | **Free** | CSV (direct download) | National → ZIP | Monthly inventory (updated ~1st of month); weekly inventory also | Attribution required; commercial redistribution unclear — contact economics@realtor.com before paid product | June 2026 monthly (as of July 2026 page) | **4** |
| **Zillow Research** (beyond ZHVI) | DOM (days to pending), price-cut share, inventory, sale PSF (sales section) | **Free** | Bulk CSV (`files.zillowstatic.com`) | ZIP, metro, city, county, state, nation | Monthly (~16th) | [Research terms](https://www.zillowgroup.com/developers/api/public-data/real-estate-metrics/): free for public use; **clear Zillow attribution**; aggregate derivative charts OK; no raw CSV re-export to users | Active (paths occasionally change) | **4** |
| **Census ACS + ZHVI derived** | PSF proxy = ZHVI ÷ sqft | **Free** | Census API + existing ZHVI | ZIP (ZCTA) | ACS **annual** (5-year); ZHVI monthly | Public domain (Census); Zillow attribution for ZHVI | ACS 2024 5-year (Jan 2026 release); ZHVI current | **2** |
| **HUD / FHFA** | HPI only (no DOM/PSF/walkability) | Free | Bulk CSV | Metro/state | Quarterly | Public | Current | N/A (already ingested) |
| **OSM / Overpass** | Walkability proxy (amenity density, 15-min access) | **Free** | Overpass API + optional local PBF | Global; quality varies by metro | On-demand; recommend **weekly cache** | [ODbL](https://www.openstreetmap.org/copyright): attribution required; share-alike on OSM-derived DB if distributed | Live | **3** |
| **Walk Score API** | Walk, Transit, Bike scores | Free tier 5k calls/day; Premium **~$115/mo+**; Enterprise custom | REST API (lat/lon) | US/CA addresses | On-demand | [Terms](https://www.walkscore.com/professional/api.php): free tier consumer-facing only; **offline/bulk cache = Enterprise** | Active 2026 | **2** (sandbox only) |
| **ATTOM Data** | DOM, PSF, price cuts, property-level | **Paid** ~$90–500+/mo entry; enterprise $1k+/mo | API + bulk (custom) | Property-level, 158M+ parcels | Varies | Commercial license required; ADR-012 gate | Available | **5** (post-gate) |
| **CoreLogic / Cotality** | HPI, property characteristics, foreclosure | **Paid** (enterprise quote) | API / bulk / AWS Marketplace | National property + HPI | Monthly HPI reports public; microdata licensed | Restricted commercial license | May 2026 public insights | **4** (post-gate) |

---

## 1. Days on Market (DOM)

### Recommended MVP: Redfin Data Center

| Field | Value |
|-------|-------|
| **Source** | Redfin Data Center — Housing Market Tracker |
| **URL** | Hub: https://www.redfin.com/news/data-center/ · ZIP TSV: `https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz` |
| **Cost** | Free |
| **Format** | Gzipped TSV (~58 cols); filter `period_duration = "monthly"` (or latest monthly `period_end`) |
| **Coverage** | ZIP, city, county, metro, state, national |
| **Refresh** | Monthly (released ~3rd full week); weekly rolling windows also on S3 |
| **License** | Redfin Terms of Use; attribute Redfin in UI data panel |
| **2026 vintage** | Confirmed active S3 paths via [OpenAPI spec](https://github.com/api-evangelist/redfin/blob/main/openapi/redfin-data-center-openapi.yml) |
| **Fit** | **5/5** — direct `median_dom`, sale-based (closed transactions), ZIP granularity, same bulk pattern as ZHVI |

**Implementation sketch**

```
data/ingest/redfin/
  raw/zip_code_market_tracker.tsv000.gz   # gitignored
  normalized/zip-latest.json              # { zipCode, medianDom, vintage, ... }
  normalized/metro-latest.json
```

- Script: `pnpm --filter @cineborough/data ingest:redfin` — stream-decompress TSV, keep latest monthly row per ZIP, map `region` → ZCTA.
- Shard merge: overlay `daysOnMarket` in `merge-shard-metrics.ts`; update `metric-provenance.ts`.
- Cron: monthly after Redfin publish (~day 20).

### Alternatives

**Realtor.com Research** — https://www.realtor.com/research/data/

- **Metric:** `Median DOM` (median days listings spend on market; listing-side, not sale-side).
- **Cost:** Free CSV (monthly + historical ZIP files).
- **Cadence:** Monthly, updated ~1st of month (June 2026 data published July 2026).
- **Fit:** **4/5** — excellent for *active listing* DOM; differs definition from Redfin sale-side median DOM. Good cross-check, not primary if we want closed-sale tempo.
- **Ingest path:** `data/ingest/realtor/` mirroring Redfin normalize step.

**Zillow Research — Days on Market and Price Cuts section** — https://www.zillow.com/research/data/

- **Metric:** Median/mean *days to pending* (not identical to traditional DOM).
- **URL pattern:** `https://files.zillowstatic.com/research/public_csvs/days_on_market/Zip_median_days_to_pending_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv` (verify path on portal; Zillow occasionally renames folders).
- **Cost:** Free bulk CSV.
- **Cadence:** Monthly (~16th).
- **Fit:** **4/5** — ADR-012 compliant; same parser as ZHVI; definition differs from Redfin/Realtor.
- **Ingest path:** extend `data/ingest/zhvi/` → rename to `data/ingest/zillow-research/` or add `zillow-market/` sibling.

**ATTOM / CoreLogic** — Paid; ADR-012 gated. Best property-level DOM when budget approved.

---

## 2. Market PSF (price per square foot)

### Recommended MVP: Redfin Data Center `median_ppsf`

| Field | Value |
|-------|-------|
| **Source** | Redfin Data Center (same ZIP TSV as DOM) |
| **Column** | `median_ppsf` — median **sale** price per square foot |
| **Cost** | Free |
| **Coverage** | ZIP → national |
| **Refresh** | Monthly |
| **Fit** | **4/5** — direct observed sale PSF; sparse in low-volume ZIPs |

**Implementation sketch:** Same Redfin ingest as DOM; add `marketPsf: median_ppsf` to normalized JSON. Fallback chain at shard build: Redfin PSF → Realtor list PSF → ZHVI-derived proxy.

### Alternatives

**Realtor.com — `Median List Price Per Sqft`**

- Listing-side PSF (ask, not closed sale). Better coverage in thin markets.
- Same CSV bundle as DOM; **Fit: 4/5** as secondary/fallback.

**Zillow Research — Sales section**

- `Metro_median_sale_price_per_sqft_*` bulk CSVs (sale-based, smoothed).
- **Fit: 3/5** for PSF — metro/city strong; ZIP coverage spottier than Redfin.

**Census ACS B25035 — NOT suitable for PSF**

> **Correction:** Table B25035 is *Median Year Structure Built*, not square footage. **ACS does not publish housing unit square footage** at any geography. ADR-012’s “ZHVI / ACS median sqft” derivation is **not viable** with public ACS tables.

**Viable derived proxy (fallback only):**

```
marketPsf ≈ zhvi / medianListingSqft   # Realtor.com column Median Listing Sqft
```

Or `zhvi / estimatedSqft` from bedroom distribution (B25041) × regional sqft-per-bedroom heuristics — low confidence; use only when direct PSF missing.

**ATTOM / county assessor bulk** — Paid; true living-area PSF at parcel level (Phase 3 / post-gate).

---

## 3. Walkability score

### Recommended MVP: OSM / Overpass amenity proxy (ADR-012)

| Field | Value |
|-------|-------|
| **Source** | OpenStreetMap via Overpass API (+ optional Nominatim geocode) |
| **URL** | https://overpass-api.de/ · https://wiki.openstreetmap.org/wiki Overpass queries |
| **Cost** | Free (self-host or respect public instance rate limits) |
| **Format** | Overpass JSON → derived 0–100 score |
| **Coverage** | Any lat/lon; urban DC sandbox well-mapped |
| **Refresh** | Weekly or monthly batch cache (POIs change slowly) |
| **License** | ODbL — © OpenStreetMap contributors; display attribution |
| **2026 vintage** | Live |
| **Fit** | **3/5** — not Walk Score™; correlates r≈0.6–0.8 in urban areas; good enough for choropleth ranking |

**Scoring approach (matches schema 0–100):**

1. Compute ZCTA centroid (existing TIGER boundaries).
2. Query amenities within **800 m** (10-min walk): grocery, restaurant, school, park, transit stop, pharmacy (Overpass `amenity=*`, `shop=*`, `leisure=park`, `highway=bus_stop`).
3. Weight categories (daily essentials > dining > recreation); normalize to 0–100 vs metro baseline.
4. Optional: OSMnx pedestrian network for intersection density (higher effort, Phase 2).

**Implementation sketch**

```
data/ingest/osm-walkability/
  raw/overpass/{zcta}.json        # gitignored or sandbox-only committed
  normalized/zip-latest.json      # { zipCode, walkabilityScore, computedAt }
```

- Script: `pnpm --filter @cineborough/data ingest:walkability -- --zips=22201,...`
- Rate limit: ~1 req/sec on public Overpass; sandbox 34 ZIPs ≈ 1 min; national batch → run monthly overnight or use Geofabrik PBF + local extract.
- Cache TTL: 30 days (ADR-012 “weekly cache”).

### Alternatives

**Walk Score API** — https://www.walkscore.com/professional/api.php

| Tier | Cost | Limits | Fit |
|------|------|--------|-----|
| Free | $0 | 5,000 calls/day; consumer-facing apps only | **2/5** — OK for DC sandbox (34 ZIPs) once; not national |
| Premium | ~$115/mo+ | Caching allowed; multiple domains | **3/5** — still lat/lon per request, no bulk ZIP file |
| Enterprise | Custom | Offline/bulk use | **4/5** — likely >$100/mo; defer |

**Walk Score cannot be bulk-cached on free tier for choropleth tiles.** Use only if product requires trademark “Walk Score®” and budget allows Premium+.

**Census LEHD / EPA Smart Location Database** — Free, tract-level; annual vintage; would require ZCTA←tract crosswalk. **Fit: 2/5** for MVP (extra join complexity, stale).

---

## 4. Seller desperation

Seller desperation is **derived** in [metrics taxonomy](../schema/metrics-taxonomy.md):

```
sellerDesperationScore = min(100, (daysOnMarket / 90) * 50 + (priceCutCount * 25))
```

No single public bulk field maps to `priceCutCount` at ZIP level. Build from **composite signals**:

### Recommended MVP: Derived from Redfin + Zillow bulk

| Signal | Source | Field |
|--------|--------|-------|
| DOM (primary input) | Redfin | `median_dom` |
| Price cuts (%) | Redfin | `price_drops` (% listings with price drop) |
| Inventory pressure | Redfin | `inventory`, `months_of_supply` |
| Cross-check cuts | Zillow Research | Share of listings with price cut (bulk CSV) |
| Listing urgency | Realtor.com | `Price Decrease Count`, `Pending Ratio` |

**Proposed formula (document in schema before implement):**

```
domComponent    = clamp(medianDom / 90, 0, 1) * 50
cutComponent    = clamp(priceDropPct / 20, 0, 1) * 30   # 20%+ cuts = max
inventoryComponent = clamp(monthsOfSupply / 6, 0, 1) * 20
sellerDesperationScore = min(100, domComponent + cutComponent + inventoryComponent)
```

Map `priceDropPct` from Redfin `price_drops` (already 0–100 scale). Replaces mock `priceCutCount` with continuous cut share — update taxonomy note when ticket lands.

| Field | Value |
|-------|-------|
| **Cost** | Free (piggybacks Redfin + optional Zillow ingest) |
| **Refresh** | Monthly |
| **Fit** | **4/5** — aggregate signals, not property-level cut counts |

**Implementation sketch**

- No separate ingest folder; computed in `packages/data/src/ingest/derived-market-stress.ts` at shard build from `redfin/normalized/zip-latest.json`.
- Provenance: `derived:redfin+zillow` with model confidence ~0.6.

### Alternatives

**Realtor.com alone** — `Price Decrease Count` + `Median DOM` + `Active Listing Count`. **Fit: 3/5** — count-based, not percentage; harder to normalize across ZIP sizes.

**Zillow price-cut CSVs alone** — **Fit: 3/5** — good cut signal, weak inventory without separate `invt_fs` CSV.

**ATTOM** — listing event history with explicit price reduction counts. **Fit: 5/5** post-gate.

---

## Paid sources (documented gates)

### ATTOM Data

- **URL:** https://api.developer.attomdata.com/
- **Cost:** ~$90–200/mo subscription tiers; enterprise $500–1k+/mo; per-report pricing.
- **Value:** Property-level DOM, price history, sqft, AVM — unlocks Level 3 valuation.
- **Gate:** ADR-012 — S010 journey validated + redistribution license + budget.
- **Fit:** 5/5 when unlocked; 0/5 for current MVP budget.

### CoreLogic / Cotality

- **URL:** https://www.cotality.com/ (formerly CoreLogic)
- **Cost:** Enterprise quote only; no public bulk free tier.
- **Value:** Repeat-sales HPI, property characteristics, foreclosure rates.
- **Fit:** 4/5 for institutional accuracy; defer.

---

## Recommended MVP ingest stack

```
Monthly cron (production)
├── ingest:redfin          → DOM, PSF, inventory, price_drops  [NEW T046]
├── ingest:zillow-market   → DOM/cuts/inventory cross-check     [NEW T047]
├── ingest:zhvi            → (existing) home values
├── ingest:census-acs      → (existing) annual demographics
├── ingest:fhfa-hpi        → (existing) quarterly HPI
├── ingest:walkability     → OSM proxy, weekly/monthly cache     [NEW T048]
└── build:geojson          → derived sellerDesperationScore       [NEW T049]
```

**Attribution footer (UI):** Census · Zillow Research · Redfin · OpenStreetMap · (optional) Realtor.com

---

## Implementation effort estimates

| Ticket | Scope | Effort | Dependencies |
|--------|-------|--------|--------------|
| T046 Redfin market tracker ingest | Download S3 TSV, normalize ZIP+metro, wire DOM + PSF + price_drops + inventory | **2–3 days** | — |
| T047 Zillow market metrics ingest | DOM + price_cuts + invt_fs CSVs (reuse ZHVI parser) | **1–2 days** | — |
| T048 OSM walkability batch | ZCTA centroid Overpass scoring, cache normalized JSON | **4–6 days** | T010 boundaries |
| T049 Derived seller desperation | Formula + shard merge + schema/provenance update | **1–2 days** | T046 |
| T050 Realtor.com ingest (optional) | Secondary DOM/list PSF/decrease counts | **1–2 days** | — |

**Total MVP (T046 + T048 + T049):** ~7–11 dev days.  
**With cross-check sources (T047 + T050):** ~9–15 dev days.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Redfin/Realtor terms change | Display-only choropleth + attribution; no raw CSV API to end users; confirm commercial terms before monetization |
| Zillow CSV path rotation | Centralize URLs in `*-sources.ts`; smoke test on cron |
| Overpass rate limits | Sandbox-first; exponential backoff; Geofabrik PBF for national batch |
| ZIP-level sparsity (PSF/DOM) | Metro fallback in shard merge (existing FHFA/ZHVI fallback pattern) |
| Metric definition drift | Document Redfin sale-side DOM vs Realtor listing DOM in provenance labels |

---

## References

- [ADR-012: Public Bulk Ingest](../adr/012-public-bulk-data-ingest.md)
- [Metrics taxonomy](../schema/metrics-taxonomy.md)
- [Redfin Data Center](https://www.redfin.com/news/data-center/)
- [Realtor.com Research Data Library](https://www.realtor.com/research/data/)
- [Zillow Research Data](https://www.zillow.com/research/data/)
- [Census ACS API](https://www.census.gov/programs-surveys/acs/data/data-via-api.html)
- [Walk Score Professional](https://www.walkscore.com/professional/api.php)
- [OpenStreetMap ODbL](https://www.openstreetmap.org/copyright)
