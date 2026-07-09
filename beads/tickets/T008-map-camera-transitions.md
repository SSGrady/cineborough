---
id: T008
title: Enhanced map camera transitions
status: open
type: feature
priority: P1
epic: E002
sprint: S002
depends_on:
  - T006
acceptance:
  - MapView accepts external camera target (center, zoom, pitch, bearing)
  - Smooth flyTo transitions when camera target changes
  - Scroll sections trigger appropriate camera positions (metro wide → neighborhood close)
  - ZIP click still triggers Level 2 flyTo
---

# T008 — Enhanced Map Camera Transitions

## Description

Expose imperative camera control on MapView and wire to GSAP ScrollTrigger section progression. Metro overview uses flat pitch; neighborhood descent adds pitch/bearing for cinematic feel.
