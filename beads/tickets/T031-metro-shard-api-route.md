---
id: T031
title: Metro shard API route stub
status: done
type: feature
priority: P2
epic: E006
sprint: S007
depends_on:
  - T030
acceptance:
  - GET /api/v1/metros/{cbsa}/geojson returns bundled shard or 404 fallback
  - fetchMetroShard uses local /api/v1 when no external METRO_API_BASE_URL
  - CBSA validated as 5-digit code
---

# T031 — Metro Shard API Route

ADR-011 on-demand long-tail metro fetch via Next.js API route stub.
