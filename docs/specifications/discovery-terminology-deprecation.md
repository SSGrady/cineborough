# Discovery terminology — internal deprecation

**Status:** Active (T082, S015)  
**User-facing rule:** Zero `"wish"` strings in discovery UI components.

## Lint guard

```bash
pnpm lint:discovery-terms
```

Scans `apps/web/src/components/*Discovery*`, `*Criteria*`, `*Matches*`, `CompareChips`, `ByExample*`, `CriterionRange*` for user-facing `"wish"` regressions. Comments documenting ADR cross-refs are allowed.

## Internal `Wish*` identifiers

| Artifact | Status | Remove by |
|----------|--------|-----------|
| `WishRangeSlider` filename | Renamed → `CriterionRangeSlider` | Done (T077) |
| `wishlist-scoring.ts` | Renamed → `hybrid-scoring.ts` | Done (T066) |
| ADR-014 / beads `wishlist` references | Historical internal-only | Keep in ADRs; not user-facing |
| `docs/specifications/wishlist-discovery.md` | Superseded by `discovery-criteria-ux-v2.md` | Archive after E009 close |

New discovery UI must use **criteria**, **match %**, and **find matches** vocabulary per ADR-014.
