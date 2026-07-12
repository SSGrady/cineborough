"use client";

import type { RankedNeighborhood } from "@cineborough/data";

interface MatchesListProps {
  results: RankedNeighborhood[];
  selectedZip: string | null;
  favorites: Set<string>;
  onSelect: (zip: string) => void;
  onToggleFavorite: (zip: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function matchTierClass(pct: number): string {
  if (pct >= 90) return "matches-list__badge--strong";
  if (pct >= 70) return "matches-list__badge--close";
  return "matches-list__badge--partial";
}

export function MatchesList({
  results,
  selectedZip,
  favorites,
  onSelect,
  onToggleFavorite,
  collapsed = false,
  onToggleCollapse,
}: MatchesListProps) {
  if (collapsed) {
    return (
      <aside className="matches-list matches-list--collapsed" aria-label="Matches">
        <button
          type="button"
          className="matches-list__expand"
          onClick={onToggleCollapse}
          aria-label="Expand matches"
        >
          {results.length}
        </button>
      </aside>
    );
  }

  return (
    <aside className="matches-list" aria-label="Ranked matches">
      <header className="matches-list__header">
        <div className="matches-list__title-row">
          <h2>Matches</h2>
          <span className="matches-list__count">
            {results.length} neighborhood{results.length === 1 ? "" : "s"}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            className="matches-list__collapse"
            onClick={onToggleCollapse}
            aria-label="Collapse matches"
          >
            ›
          </button>
        )}
      </header>

      <ol className="matches-list__items">
        {results.map((r) => {
          const isSelected = selectedZip === r.zip;
          const isFavorite = favorites.has(r.zip);
          const rounded = Math.round(r.matchPercent);
          return (
            <li key={r.zip}>
              <button
                type="button"
                className={`matches-list__row${isSelected ? " matches-list__row--active" : ""}`}
                onClick={() => onSelect(r.zip)}
              >
                <span className="matches-list__rank">#{r.rank}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className={`matches-list__heart${isFavorite ? " matches-list__heart--on" : ""}`}
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(r.zip);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleFavorite(r.zip);
                    }
                  }}
                >
                  {isFavorite ? "♥" : "♡"}
                </span>
                <span className="matches-list__info">
                  <span className="matches-list__zip">{r.zip}</span>
                  <span className="matches-list__name">{r.name}</span>
                </span>
                <span
                  className={`matches-list__badge ${matchTierClass(rounded)}`}
                  aria-label={`${rounded}% match`}
                >
                  {rounded}%
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
