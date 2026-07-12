"use client";

import { useCallback, useState } from "react";
import type { RankedNeighborhood } from "@cineborough/data";

const MAX_COMPARE_PINS = 4;

interface CompareChipsProps {
  pinned: RankedNeighborhood[];
  activeZip: string | null;
  onSelect: (zip: string) => void;
  onRemove: (zip: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function matchTierClass(pct: number): string {
  if (pct >= 90) return "compare-chips__pct--strong";
  if (pct >= 70) return "compare-chips__pct--close";
  return "compare-chips__pct--partial";
}

export function CompareChips({
  pinned,
  activeZip,
  onSelect,
  onRemove,
  onReorder,
}: CompareChipsProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  }, []);

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIndex !== null && dragIndex !== index) {
        onReorder(dragIndex, index);
      }
      setDragIndex(null);
      setDropIndex(null);
    },
    [dragIndex, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropIndex(null);
  }, []);

  if (pinned.length === 0) return null;

  return (
    <div className="compare-chips" role="group" aria-label="Compare neighborhoods">
      <span className="compare-chips__label">Compare</span>
      {pinned.map((r, index) => {
        const isActive = activeZip === r.zip;
        const rounded = Math.round(r.matchPercent);
        const isDragging = dragIndex === index;
        const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
        return (
          <button
            key={r.zip}
            type="button"
            draggable
            className={`compare-chips__chip${isActive ? " compare-chips__chip--active" : ""}${isDragging ? " compare-chips__chip--dragging" : ""}${isDropTarget ? " compare-chips__chip--drop-target" : ""}`}
            onClick={() => onSelect(r.zip)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            aria-grabbed={isDragging}
          >
            <span className="compare-chips__zip">{r.zip}</span>
            <span className="compare-chips__name">{r.name}</span>
            <span className={`compare-chips__pct ${matchTierClass(rounded)}`}>{rounded}%</span>
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
      {pinned.length >= MAX_COMPARE_PINS && (
        <span className="compare-chips__label" aria-live="polite">
          max {MAX_COMPARE_PINS}
        </span>
      )}
    </div>
  );
}
