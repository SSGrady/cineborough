---
id: T052
title: Route path trace-in animation on flyover arrival
status: done
type: feature
priority: P1
epic: E002
sprint: S011
depends_on:
  - T044
  - T009
acceptance:
  - Path animates 0→100% during flying phase synced to FLYOVER_CAMERA_MS
  - Full path visible during highlight phase
  - ZIP-filtered transit paths
---

# T052 — Route Path Trace-In

## Completion (2026-07-11)

- `apps/web/src/lib/path-trace.ts` — `truncateLinePath()` for even-speed trace-in
- MapView `pathTraceProgress` + `pathFilterZip` props
- CinematicDiscovery RAF animation during discovery flyover `flying` phase
