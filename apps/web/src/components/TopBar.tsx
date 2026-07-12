import type { GeographyLevel } from "@cineborough/geo";
import type { SearchResult } from "@/lib/search-index";
import { GeographyBar } from "./GeographyBar";
import { SearchBar } from "./SearchBar";

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
}: TopBarProps) {
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
      {(onToggleCriteriaView || onDiscover) && (
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
          {onDiscover && (
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
