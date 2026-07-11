---
id: T042
title: Discovery criteria panel
status: done
type: feature
priority: P1
epic: E007
sprint: S010
depends_on:
  - T037
acceptance:
  - User sets budget, min cap rate, max overvaluation, min walkability, remote work floor
  - Criteria persist for session and feed scoring engine
---

# T042 — Discovery Criteria Panel

Step A of primary user journey.

## Completion (2026-07-11)

- `DiscoveryCriteriaPanel` drawer with budget range + hybrid filters
- Top bar **Criteria** button; state persisted to `sessionStorage`
- Criteria feed `rankNeighborhoods()` in discover flow
