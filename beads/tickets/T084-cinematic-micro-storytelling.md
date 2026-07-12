---
id: T084
title: Cinematic micro-storytelling on location select
status: open
type: feature
priority: P1
epic: E009
sprint: S015
depends_on:
  - T078
  - T007
acceptance:
  - Matches-list or compare-chip select triggers 2–3s GSAP eased flyTo (pitch 45°)
  - LocaleQuoteCard fades in at selected ZIP map anchor
  - Optional amenity POI pulse during transition (E002 T051)
  - Interruptible — does not block further map interaction
  - Distinct from E007 top-3 flyover tour
---

# T084 — Cinematic Micro-Storytelling

## Description

Short cinematic beat on single-location select: camera + vibe quote per ADR-015 §3b. Bridges Phase 1 data engine and ADR-008 cinematic north star.

## Notes

Part 2 moat #2. Reuses E002 `CINEMATIC_CAMERAS`, locale quotes, amenity POIs.
