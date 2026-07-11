import type { GeographyLevel } from "@cineborough/geo";
import type { SearchResult } from "@/lib/search-index";
import { GeographyBar } from "./GeographyBar";
import { SearchBar } from "./SearchBar";

interface TopBarProps {
  subtitle: string;
  geography: GeographyLevel;
  onGeographyChange: (level: GeographyLevel) => void;
  sandboxDrillActive?: boolean;
  searchIndex: SearchResult[];
  onSearchSelect: (result: SearchResult) => void;
  onOpenCriteria?: () => void;
  onDiscover?: () => void;
  discoverDisabled?: boolean;
  discoverLabel?: string;
}

export function TopBar({
  subtitle,
  geography,
  onGeographyChange,
  sandboxDrillActive = false,
  searchIndex,
  onSearchSelect,
  onOpenCriteria,
  onDiscover,
  discoverDisabled = false,
  discoverLabel = "Find neighborhoods",
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <h1>Cineborough</h1>
        <p>{subtitle}</p>
      </div>
      <SearchBar index={searchIndex} onSelect={onSearchSelect} />
      {(onOpenCriteria || onDiscover) && (
        <div className="top-bar__discovery" role="group" aria-label="Neighborhood discovery">
          {onOpenCriteria && (
            <button type="button" className="top-bar__criteria-btn" onClick={onOpenCriteria}>
              Criteria
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
      <GeographyBar
        geography={geography}
        onGeographyChange={onGeographyChange}
        sandboxDrillActive={sandboxDrillActive}
      />
    </header>
  );
}
