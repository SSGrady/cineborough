"use client";

import { useMemo } from "react";
import { dedupeRankedMatchesByDisplayName, type RankedNeighborhood } from "@cineborough/data";
import { formatUsStateHeading } from "@/lib/us-state-names";
import { matchKey } from "@/lib/match-keys";
import { CompareChips } from "./CompareChips";

interface MatchesListProps {
  results: RankedNeighborhood[];
  selectedKey: string | null;
  favorites: Set<string>;
  onSelect: (key: string, match: RankedNeighborhood) => void;
  onToggleFavorite: (key: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: "rail" | "deck";
  comparePinned?: RankedNeighborhood[];
  compareActiveZip?: string | null;
  onCompareSelect?: (zip: string) => void;
  onCompareRemove?: (zip: string) => void;
  onCompareReorder?: (fromIndex: number, toIndex: number) => void;
}

interface StateGroup {
  state: string;
  label: string;
  items: RankedNeighborhood[];
}

function matchTierClass(pct: number): string {
  if (pct >= 90) return "matches-list__badge--strong";
  if (pct >= 70) return "matches-list__badge--close";
  return "matches-list__badge--partial";
}

/** Preserve rank order; group consecutive state blocks for WMIL-style headings. */
function groupMatchesByState(results: RankedNeighborhood[]): StateGroup[] {
  const groups: StateGroup[] = [];
  const indexByState = new Map<string, number>();

  for (const result of results) {
    const state = result.state.trim() || "Unknown";
    const existing = indexByState.get(state);
    if (existing !== undefined) {
      groups[existing].items.push(result);
      continue;
    }
    indexByState.set(state, groups.length);
    groups.push({
      state,
      label: formatUsStateHeading(state),
      items: [result],
    });
  }

  return groups;
}

export function MatchesList({
  results,
  selectedKey,
  favorites,
  onSelect,
  onToggleFavorite,
  collapsed = false,
  onToggleCollapse,
  variant = "deck",
  comparePinned = [],
  compareActiveZip = null,
  onCompareSelect,
  onCompareRemove,
  onCompareReorder,
}: MatchesListProps) {
  const displayResults = useMemo(
    () => dedupeRankedMatchesByDisplayName(results),
    [results],
  );
  const stateGroups = groupMatchesByState(displayResults);
  const rootClass =
    variant === "deck"
      ? `match-deck${collapsed ? " match-deck--collapsed" : ""}`
      : `matches-list${collapsed ? " matches-list--collapsed" : ""}`;

  if (collapsed) {
    return (
      <aside className={rootClass} aria-label="Matches">
        <button
          type="button"
          className="match-deck__expand match-deck__expand--pill"
          onClick={onToggleCollapse}
          aria-label={`${displayResults.length} matches found — expand list`}
        >
          <span aria-hidden="true">🍿</span>
          <span className="match-deck__expand-label">
            {displayResults.length} Match{displayResults.length === 1 ? "" : "es"} Found
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className={rootClass} aria-label="Ranked matches">
      <header className="match-deck__header">
        <div className="match-deck__title-row">
          <h2>Matches</h2>
          <span className="match-deck__count">
            {displayResults.length} neighborhood{displayResults.length === 1 ? "" : "s"}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            className="match-deck__collapse"
            onClick={onToggleCollapse}
            aria-label="Collapse matches"
          >
            ↓
          </button>
        )}
      </header>

      {comparePinned.length > 0 && onCompareSelect && onCompareRemove && onCompareReorder && (
        <div className="match-deck__compare">
          <CompareChips
            pinned={comparePinned}
            activeZip={compareActiveZip}
            onSelect={onCompareSelect}
            onRemove={onCompareRemove}
            onReorder={onCompareReorder}
          />
        </div>
      )}

      <div className="match-deck__items">
        {stateGroups.map((group) => (
          <section key={group.state} className="match-deck__group" aria-label={group.label}>
            <h3 className="match-deck__state">{group.label}</h3>
            <ol className="match-deck__group-items">
              {group.items.map((r) => {
                const key = matchKey(r);
                const isSelected = selectedKey === key;
                const isFavorite = favorites.has(key);
                const rounded = Math.round(r.matchPercent);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={`match-deck__row${isSelected ? " match-deck__row--active" : ""}`}
                      onClick={() => onSelect(key, r)}
                      aria-current={isSelected ? "true" : undefined}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        className={`match-deck__heart${isFavorite ? " match-deck__heart--on" : ""}`}
                        aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleFavorite(key);
                          }
                        }}
                      >
                        {isFavorite ? "♥" : "♡"}
                      </span>
                      <span className="match-deck__info">
                        <span className="match-deck__name">{r.name}</span>
                        <span className="match-deck__zip">
                          {r.zip}
                          {r.metroName && (
                            <span className="match-deck__metro"> · {r.metroName}</span>
                          )}
                          {r.similarityPercent !== undefined && (
                            <span className="match-deck__similarity">
                              {" "}
                              · {Math.round(r.similarityPercent)}% similar
                            </span>
                          )}
                        </span>
                      </span>
                      <span
                        className={`match-deck__badge ${matchTierClass(rounded)}`}
                        aria-label={`${rounded}% match`}
                      >
                        {rounded}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </aside>
  );
}
