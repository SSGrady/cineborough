---
id: T061
title: Google 3D tiles integration stub + feature flag
status: done
type: feature
priority: P1
epic: E002
sprint: S013
depends_on:
  - T055
acceptance:
  - NEXT_PUBLIC_ENABLE_3D_TILES flag in .env.example
  - Tile3DLayer stub with graceful 2D fallback
  - Missing-key dev badge when flag on without API key
---

# T061 — Google 3D Tiles Stub

Done 2026-07-12: `cinematic-flags.ts`, `google-3d-tiles.ts`, MapView layer, `Google3DTilesBadge`.
