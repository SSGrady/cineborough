---
id: T009
title: Route/path overlay on map
status: open
type: feature
priority: P2
epic: E002
sprint: S002
depends_on:
  - T008
acceptance:
  - Deck.gl PathLayer renders mock transit or walk path in Arlington
  - Path appears during neighborhood descent scroll section
  - Path styled as glowing line (width, color) per ADR-008 intent
  - Mock GeoJSON stored in data/mock/
---

# T009 — Route/Path Overlay on Map

## Description

Trace a mock Arlington path (Orange Line corridor or Clarendon walk path) using Deck.gl PathLayer. Path fades in when user scrolls to neighborhood section.
