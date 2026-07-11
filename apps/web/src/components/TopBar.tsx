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
}

export function TopBar({
  subtitle,
  geography,
  onGeographyChange,
  sandboxDrillActive = false,
  searchIndex,
  onSearchSelect,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <h1>Cineborough</h1>
        <p>{subtitle}</p>
      </div>
      <SearchBar index={searchIndex} onSelect={onSearchSelect} />
      <GeographyBar
        geography={geography}
        onGeographyChange={onGeographyChange}
        sandboxDrillActive={sandboxDrillActive}
      />
    </header>
  );
}
