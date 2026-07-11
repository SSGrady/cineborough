---
id: T044
title: Top-3 cinematic flyover
status: done
type: feature
priority: P1
epic: E007
sprint: S010
depends_on:
  - T043
acceptance:
  - Camera flies to top 3 ranked neighborhoods in sequence
  - Green space and amenity highlights visible during flyover
---

# T044 — Top-3 Flyover

Step B of primary user journey.

## Completion (2026-07-11)

- **Find neighborhoods** runs scoring → top 3 sequential flyover
- `discoveryFlyoverCamera()` pitched descent to ZIP centroids
- Context chip shows rank, score, and metrics at each stop; skip tour action
- Green-space/amenity map highlights deferred (MVP uses metric highlight + chip only)
