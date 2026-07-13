import type { ReactNode } from "react";
import type { GeographyLevel } from "@cineborough/geo";
import type { SearchResult } from "@/lib/search-index";
import { GeographyBar } from "./GeographyBar";
import { SearchBar } from "./SearchBar";

export interface TopBarOverviewChip {
  stepLabel: string;
  title: string;
  detail?: string;
  onOpenDrawer?: () => void;
}

interface TopBarProps {
  subtitle: string;
  geography: GeographyLevel;
  onGeographyChange: (level: GeographyLevel) => void;
  sandboxDrillActive?: boolean;
  criteriaMode?: boolean;
  searchIndex: SearchResult[];
  onSearchSelect: (result: SearchResult) => void;
  onToggleCriteriaView?: () => void;
  criteriaViewActive?: boolean;
  onDiscover?: () => void;
  discoverDisabled?: boolean;
  discoverLabel?: string;
  matchCount?: number;
  matchingInFlight?: boolean;
  showMatchTicker?: boolean;
  matchDeckExpanded?: boolean;
  onToggleMatchDeck?: () => void;
  overviewChip?: TopBarOverviewChip;
  matchDeck?: ReactNode;
}

export function TopBar({
  subtitle,
  geography,
  onGeographyChange,
  sandboxDrillActive = false,
  criteriaMode = false,
  searchIndex,
  onSearchSelect,
  onToggleCriteriaView,
  criteriaViewActive = false,
  onDiscover,
  discoverDisabled = false,
  discoverLabel = "Find matches",
  matchCount = 0,
  matchingInFlight = false,
  showMatchTicker = false,
  matchDeckExpanded = false,
  onToggleMatchDeck,
  overviewChip,
  matchDeck,
}: TopBarProps) {
  const showWhatSection = Boolean(
    onToggleCriteriaView || onDiscover || showMatchTicker || overviewChip,
  );

  return (
    <header className="top-bar">
      <div className="top-bar__where" aria-label="Scope and search">
        <div className="top-bar__brand">
          <h1>Cineborough</h1>
          <p>{subtitle}</p>
        </div>
        <SearchBar index={searchIndex} onSelect={onSearchSelect} />
        <GeographyBar
          geography={geography}
          onGeographyChange={onGeographyChange}
          sandboxDrillActive={sandboxDrillActive}
          criteriaMode={criteriaMode}
        />
      </div>
      {showWhatSection && (
        <div className="top-bar__what" role="group" aria-label="Discovery filters">
          {onToggleCriteriaView && (
            <button
              type="button"
              className={`top-bar__criteria-btn${criteriaViewActive ? " top-bar__criteria-btn--active" : ""}`}
              onClick={onToggleCriteriaView}
              aria-pressed={criteriaViewActive}
            >
              {criteriaViewActive ? "Map overview" : "Your criteria"}
            </button>
          )}
          {overviewChip && (
            <div className="top-bar__context-chip">
              <span className="top-bar__context-chip-step">{overviewChip.stepLabel}</span>
              <button
                type="button"
                className="top-bar__context-chip-main"
                onClick={overviewChip.onOpenDrawer}
                disabled={!overviewChip.onOpenDrawer}
                aria-label={
                  overviewChip.onOpenDrawer
                    ? `Open details: ${overviewChip.title}`
                    : undefined
                }
              >
                <span className="top-bar__context-chip-title">{overviewChip.title}</span>
                {overviewChip.detail && (
                  <span className="top-bar__context-chip-detail">{overviewChip.detail}</span>
                )}
              </button>
            </div>
          )}
          {showMatchTicker && (
            <div className="top-bar__match-anchor">
              {onToggleMatchDeck ? (
                <button
                  type="button"
                  className={`match-ticker match-ticker--toggle${matchingInFlight ? " match-ticker--loading" : ""}${matchDeckExpanded ? " match-ticker--expanded" : ""}`}
                  onClick={onToggleMatchDeck}
                  aria-expanded={matchDeckExpanded}
                  aria-haspopup="listbox"
                  aria-label={
                    matchingInFlight
                      ? "Matching neighborhoods"
                      : `${matchCount} match${matchCount === 1 ? "" : "es"} found — ${matchDeckExpanded ? "collapse" : "expand"} list`
                  }
                >
                  {matchingInFlight ? (
                    <>
                      <span className="match-ticker__pulse" aria-hidden="true" />
                      Matching…
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">🍿</span>
                      <span className="match-ticker__label">
                        {matchCount} Match{matchCount === 1 ? "" : "es"} Found
                      </span>
                      <svg
                        className="match-ticker__chevron"
                        viewBox="0 0 12 12"
                        width="12"
                        height="12"
                        aria-hidden="true"
                      >
                        {matchDeckExpanded ? (
                          <path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                    </>
                  )}
                </button>
              ) : (
                <span
                  className={`match-ticker${matchingInFlight ? " match-ticker--loading" : ""}`}
                  role="status"
                  aria-live="polite"
                >
                  {matchingInFlight ? (
                    <>
                      <span className="match-ticker__pulse" aria-hidden="true" />
                      Matching…
                    </>
                  ) : (
                    <>🍿 {matchCount} Match{matchCount === 1 ? "" : "es"} Found</>
                  )}
                </span>
              )}
              {matchDeckExpanded && matchDeck}
            </div>
          )}
          {onDiscover && !showMatchTicker && (
            <button
              type="button"
              className="top-bar__discover-btn"
              onClick={onDiscover}
              disabled={discoverDisabled}
            >
              {discoverLabel}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
