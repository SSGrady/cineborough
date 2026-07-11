"use client";

import type { UsInsetRegion } from "@cineborough/geo";

interface UsMapInsetsProps {
  onSelectRegion: (region: UsInsetRegion) => void;
  activeRegion?: UsInsetRegion;
}

const INSETS: { id: UsInsetRegion; label: string; sublabel: string }[] = [
  { id: "continental", label: "48", sublabel: "states" },
  { id: "alaska", label: "AK", sublabel: "Alaska" },
  { id: "hawaii", label: "HI", sublabel: "Hawaii" },
];

export function UsMapInsets({ onSelectRegion, activeRegion = "continental" }: UsMapInsetsProps) {
  return (
    <div className="us-insets" aria-label="US region insets">
      {INSETS.map((inset) => (
        <button
          key={inset.id}
          type="button"
          className={`us-insets__btn${activeRegion === inset.id ? " us-insets__btn--active" : ""}`}
          onClick={() => onSelectRegion(inset.id)}
          title={`View ${inset.sublabel}`}
        >
          <span className="us-insets__label">{inset.label}</span>
          <span className="us-insets__sublabel">{inset.sublabel}</span>
        </button>
      ))}
    </div>
  );
}
