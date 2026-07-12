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
  /** Hide National/State when criteria or discovery shell is active */
  criteriaMode?: boolean;
}

export function GeographyBar({
  geography,
  onGeographyChange,
  sandboxDrillActive = false,
  criteriaMode = false,
}: GeographyBarProps) {
  return (
    <div className="geo-bar" role="group" aria-label="Geography level">
      {GEOGRAPHY_OPTIONS.map((opt) => {
        const zipLocked = opt.key === "zip" && !sandboxDrillActive;
        const scopeLocked =
          criteriaMode && (opt.key === "national" || opt.key === "state");
        const disabled = zipLocked || scopeLocked;
        return (
          <button
            key={opt.key}
            type="button"
            className={`geo-bar__btn${
              geography === opt.key ? " geo-bar__btn--active" : ""
            }${disabled ? " geo-bar__btn--disabled" : ""}`}
            disabled={disabled}
            onClick={() => !disabled && onGeographyChange(opt.key)}
            aria-pressed={geography === opt.key}
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
