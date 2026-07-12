---
id: T067
title: Wishlist types + storage v3
status: open
type: feature
priority: P1
epic: E008
sprint: S014
depends_on:
  - T066
acceptance:
  - DiscoveryWishlist + DiscoveryWish types exported from @cineborough/data
  - discovery-wishlist-storage.ts v3 with v2 criteria migration
  - Sandbox default wishlists per CBSA (incl. San Jose relaxed preset)
---

# T067 — Wishlist Types + Storage v3

## Description

Data model and persistence for wish cards per ADR-014 §7. Migrate `cineborough:discovery-criteria` v2 → `cineborough:discovery-wishlist` v3 on load.
