"use client";

import { MAX_EXAMPLE_ZIPS } from "@cineborough/data";

interface ByExamplePanelProps {
  exampleZips: string[];
  selectedZip: string | null;
  zipLabels: Map<string, string>;
  onAdd: (zip: string) => void;
  onRemove: (zip: string) => void;
}

export function ByExamplePanel({
  exampleZips,
  selectedZip,
  zipLabels,
  onAdd,
  onRemove,
}: ByExamplePanelProps) {
  const canAdd =
    selectedZip !== null &&
    !exampleZips.includes(selectedZip) &&
    exampleZips.length < MAX_EXAMPLE_ZIPS;

  return (
    <div className="by-example" aria-label="By example similarity">
      <p className="by-example__intro">
        Pin 1–3 neighborhoods you like. Find matches ranks by criterion Match&nbsp;% and shows
        cosine similarity to your examples.
      </p>

      <div className="by-example__examples">
        {exampleZips.length === 0 ? (
          <p className="criteria-panel__empty">No examples yet — select a ZIP on the map.</p>
        ) : (
          exampleZips.map((zip) => (
            <div key={zip} className="by-example__chip">
              <span>
                <strong>{zip}</strong> · {zipLabels.get(zip) ?? "Neighborhood"}
              </span>
              <button
                type="button"
                className="criterion-card__remove"
                aria-label={`Remove ${zip} example`}
                onClick={() => onRemove(zip)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="by-example__add"
        disabled={!canAdd}
        onClick={() => selectedZip && onAdd(selectedZip)}
      >
        {canAdd
          ? `+ Add ${selectedZip} as example`
          : exampleZips.length >= MAX_EXAMPLE_ZIPS
            ? "Example limit reached (max 3)"
            : "Select a ZIP on the map to add"}
      </button>
    </div>
  );
}
