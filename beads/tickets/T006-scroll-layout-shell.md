---
id: T006
title: Scroll-driven page layout shell
status: open
type: feature
priority: P1
epic: E002
sprint: S002
depends_on: []
acceptance:
  - Page uses scroll-driven sections (metro overview → neighborhood descent → detail)
  - GSAP ScrollTrigger or CSS scroll-snap drives section progression
  - Map remains visible as fixed/sticky backdrop during scroll
  - Sidebar metric picker still accessible
---

# T006 — Scroll-Driven Page Layout Shell

## Description

Replace the fixed-viewport Phase 1 layout with a cinematic scroll shell per ADR-008. Three sections: metro overview, neighborhood descent (Arlington focus), and neighborhood detail. Map pins behind scrollable content panels.

## Notes

Google 3D tiles not required for this ticket — 2D Mapbox backdrop is sufficient.
