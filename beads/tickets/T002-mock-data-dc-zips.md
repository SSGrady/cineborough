---
id: T002
title: Mock data for 5 DC ZIPs
status: done
type: task
priority: P1
epic: E001
sprint: S001
depends_on:
  - T001
acceptance:
  - data/mock/zip-metrics.json with 5 DC-area ZIPs
  - Realistic investor + hope-core metrics per ADR-005
  - packages/data loaders read mock JSON
  - Types in packages/data/src/types.ts match schema docs
---

# T002 — Mock Data for 5 DC ZIPs

## Description

Create static mock JSON for the DC metro sandbox ZIPs (22201, 22202, 22204, 20814, 20001) with realistic metrics modeled on Reventure screenshots.

## Completion (2026-07-08)

- Validated `data/mock/zip-metrics.json` against types and metrics taxonomy
- Added `validation.ts` with type guards and sandbox ZIP checks
- `loadMockZipMetrics()` validates on load and enriches with opportunity scores
