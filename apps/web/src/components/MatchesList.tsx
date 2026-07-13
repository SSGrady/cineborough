"use client";

import type { RankedNeighborhood } from "@cineborough/data";
import { formatUsStateHeading } from "@/lib/us-state-names";
import { matchKey } from "@/lib/match-keys";

interface MatchesListProps {
  results: RankedNeighborhood[];
  matchCount?: number;
  selectedKey: string | null;
  favorites: Set<string>;
  onSelect: (key: string, match: RankedNeighborhood) => void;
  onToggleFavorite: (key: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  variant?: "rail" | "deck";
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
  matchCount,
  selectedKey,
  favorites,
  onSelect,
  onToggleFavorite,
  collapsed = false,
  onToggleCollapse,
  variant = "deck",
}: MatchesListProps) {
  const resolvedMatchCount = matchCount ?? results.length;
  const stateGroups = groupMatchesByState(results);
  const rootClass =
    variant === "deck"
      ? "match-deck"
      : `matches-list${collapsed ? " matches-list--collapsed" : ""}`;

  return (
    <aside className={rootClass} aria-label="Ranked matches">
      <header className="match-deck__header">
        {onToggleCollapse ? (
          <button
            type="button"
            className="match-ticker match-ticker--toggle match-ticker--expanded match-deck__ticker"
            onClick={onToggleCollapse}
            aria-expanded
            aria-label={`${resolvedMatchCount} match${resolvedMatchCount === 1 ? "" : "es"} found, collapse list`}
          >
            <span aria-hidden="true">🍿</span>
            <span className="match-ticker__label">
              {resolvedMatchCount} Match{resolvedMatchCount === 1 ? "" : "es"} Found
            </span>
            <svg
              className="match-ticker__chevron"
              viewBox="0 0 12 12"
              width="12"
              height="12"
              aria-hidden="true"
            >
              <path
                d="M2.5 7.5 6 4l3.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="match-ticker match-ticker--expanded match-deck__ticker">
            <span aria-hidden="true">🍿</span>
            <span className="match-ticker__label">
              {resolvedMatchCount} Match{resolvedMatchCount === 1 ? "" : "es"} Found
            </span>
          </div>
        )}
      </header>

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
                        <span className="match-deck__name">
                          {r.name}
                          {r.justThisFlagged && (
                            <span
                              className="match-deck__just-this-flag"
                              title="Partial match on a Just This criterion — strict match required"
                            >
                              Just This
                            </span>
                          )}
                        </span>
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
