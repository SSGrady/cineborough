---
id: T059
title: San Jose sandbox Phase 2a QA (CBSA 41940)
status: done
type: task
priority: P2
epic: E007
sprint: S011
depends_on:
  - T057
  - T055
acceptance:
  - San Jose drill-in loads 16 ZIP choropleth (API 200)
  - Discovery criteria yield ≥3 neighborhoods on live ingest
  - Top-3 flyover + analytics overlay + amenity POI glow
  - VTA/Caltrain/trail path trace-in on tour stops
  - pnpm --filter @cineborough/web typecheck passes
---

# T059 — San Jose Phase 2a QA

Manual end-to-end verification of Phase 2a cinematic discovery for San Jose-Sunnyvale-Santa Clara (CBSA 41940), added in T057 after T055 QA closed.

## QA results (2026-07-12)

| Sandbox | Result | Notes |
|---------|--------|-------|
| **San Jose** | **PASS** (after fix) | Search drill-in, top-3 flyover, analytics overlay, amenity POI glow. VTA/BART paths on tour stops 95110, 95035, 95126. |

### Checklist

- [x] Drill into metro → ZIP choropleth loads (API 200, 16 features)
- [x] Discovery criteria panel + top-3 flyover + analytics overlay
- [x] Amenity POI glow during highlight phase (48 POIs, 3 per ZIP)
- [x] Route path trace-in during flying phase (5 paths; top-3 tour stops covered)
- [x] No camera crashes; Playwright headless QA passed
- [x] Labels show name + metric value
- [x] State default overview unchanged on load

### Bugs found and fixed

1. **Default discovery criteria yielded 0 matches for San Jose** — Silicon Valley live ingest exceeds global `budgetMax` ($1.2M) and `minCapRate` (3.2%). Added `SAN_JOSE_DISCOVERY_CRITERIA` and auto-apply on sandbox drill-in via `discoveryCriteriaForSandbox()`.
2. **Route paths missing for likely tour stops** — Added BART Milpitas corridor (95035) and VTA Rose Garden corridor (95126) to `san-jose-transit-path.geojson` so top-3 flyover shows path trace-in.

### Known limitations (not blocking)

- Home value color thresholds ($300k/$750k) render most San Jose ZIPs red — expected for premium market; same fixed-threshold behavior as other sandboxes.
- Caltrain Palo Alto (94301) and Los Gatos trail (95030) paths exist but may not appear on every tour run depending on scoring rank.

### Verification

- Playwright headless: `node scripts/qa-san-jose-discovery.mjs` — pass.
- API: `GET /api/v1/metros/41940/geojson` → 16 features.
- Criteria simulation: 5 matches with `SAN_JOSE_DISCOVERY_CRITERIA`; DC/Orlando/SF Bay unchanged at 7/4/3.
- `pnpm --filter @cineborough/web typecheck` — pass.
