---
id: T068
title: Wish card UI + histogram slider
status: done
type: feature
priority: P1
epic: E008
sprint: S014
depends_on:
  - T067
  - T074
acceptance:
  - CriteriaPanel replaces DiscoveryCriteriaPanel in CinematicDiscovery
  - CriterionRangeSlider shows 20-bin histogram from shard values
  - Drop criterion removes card; Find matches applies criteria
---

# T068 — Criterion Card UI + Histogram Slider

> **Terminology refresh (T077):** Wish* renamed to Criteria* — see `discovery-criteria-ux-v2.md`.

## Description

Build `CriteriaPanel` and `CriterionRangeSlider` per `docs/specifications/discovery-criteria-ux-v2.md` §2–4.
