"use client";

import type { RankedNeighborhood } from "@cineborough/data";

interface CompareChipsProps {
  pinned: RankedNeighborhood[];
  activeZip: string | null;
  onSelect: (zip: string) => void;
  onRemove: (zip: string) => void;
}

export function CompareChips({ pinned, activeZip, onSelect, onRemove }: CompareChipsProps) {
  if (pinned.length === 0) return null;

  return (
    <div className="compare-chips" role="group" aria-label="Compare neighborhoods">
      {pinned.map((r) => {
        const isActive = activeZip === r.zip;
        return (
          <button
            key={r.zip}
            type="button"
            className={`compare-chips__chip${isActive ? " compare-chips__chip--active" : ""}`}
            onClick={() => onSelect(r.zip)}
          >
            <span className="compare-chips__label">
              {r.zip} · {r.name}
            </span>
            <span className="compare-chips__pct">{Math.round(r.matchPercent)}%</span>
            <span
              role="button"
              tabIndex={0}
              className="compare-chips__remove"
              aria-label={`Remove ${r.zip} from compare`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(r.zip);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(r.zip);
                }
              }}
            >
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
