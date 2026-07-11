import type { GeographyLevel } from "@cineborough/geo";

const GEOGRAPHY_OPTIONS: { key: GeographyLevel; label: string }[] = [
  { key: "national", label: "National" },
  { key: "state", label: "State" },
  { key: "metro", label: "Metro" },
  { key: "county", label: "County" },
  { key: "zip", label: "Zip" },
];

interface GeographyBarProps {
  geography: GeographyLevel;
  onGeographyChange: (level: GeographyLevel) => void;
  sandboxDrillActive?: boolean;
}

export function GeographyBar({
  geography,
  onGeographyChange,
  sandboxDrillActive = false,
}: GeographyBarProps) {
  return (
    <div className="geo-bar" role="group" aria-label="Geography level">
      {GEOGRAPHY_OPTIONS.map((opt) => {
        const zipLocked = opt.key === "zip" && !sandboxDrillActive;
        return (
          <button
            key={opt.key}
            type="button"
            className={`geo-bar__btn${
              geography === opt.key ? " geo-bar__btn--active" : ""
            }${zipLocked ? " geo-bar__btn--disabled" : ""}`}
            disabled={zipLocked}
            onClick={() => !zipLocked && onGeographyChange(opt.key)}
            aria-pressed={geography === opt.key}
            title={zipLocked ? "Open a metro sandbox to view ZIP detail" : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
