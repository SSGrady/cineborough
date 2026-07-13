import type { GeographyLevel } from "@cineborough/geo";

const GEOGRAPHY_OPTIONS: { key: GeographyLevel; label: string }[] = [
  { key: "national", label: "National" },
  { key: "state", label: "State" },
  { key: "metro", label: "Metro" },
  { key: "county", label: "County" },
  { key: "zip", label: "Zip" },
];

interface GeographyBarProps {
  /** Highlighted pill — may differ from internal geography when map shows ZIP shards. */
  activeGeographyTab: GeographyLevel;
  onGeographyChange: (level: GeographyLevel) => void;
  sandboxDrillActive?: boolean;
  /** Hide State when criteria or discovery shell is active; National stays available for nationwide find */
  criteriaMode?: boolean;
}

export function GeographyBar({
  activeGeographyTab,
  onGeographyChange,
  sandboxDrillActive = false,
  criteriaMode = false,
}: GeographyBarProps) {
  return (
    <div className="geo-bar" role="group" aria-label="Geography level">
      {GEOGRAPHY_OPTIONS.map((opt) => {
        const zipLocked = opt.key === "zip" && !sandboxDrillActive;
        const scopeLocked = criteriaMode && opt.key === "state";
        const disabled = zipLocked || scopeLocked;
        return (
          <button
            key={opt.key}
            type="button"
            className={`geo-bar__btn${
              activeGeographyTab === opt.key ? " geo-bar__btn--active" : ""
            }${disabled ? " geo-bar__btn--disabled" : ""}`}
            disabled={disabled}
            onClick={() => !disabled && onGeographyChange(opt.key)}
            aria-pressed={activeGeographyTab === opt.key}
            title={
              zipLocked
                ? "Open a metro sandbox to view ZIP detail"
                : scopeLocked
                  ? "Not available in criteria mode"
                  : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
