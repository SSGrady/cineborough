"use client";

import { MAX_EXAMPLE_ZIPS, type DiscoveryCriteria } from "@cineborough/data";
import { CITY_ARCHETYPES } from "@/lib/city-archetypes";

interface ByExamplePanelProps {
  exampleZips: string[];
  selectedZip: string | null;
  zipLabels: Map<string, string>;
  onAdd: (zip: string) => void;
  onRemove: (zip: string) => void;
  onApplyArchetype?: (criteria: DiscoveryCriteria) => void;
}

export function ByExamplePanel({
  exampleZips,
  selectedZip,
  zipLabels,
  onAdd,
  onRemove,
  onApplyArchetype,
}: ByExamplePanelProps) {
  const canAdd =
    selectedZip !== null &&
    !exampleZips.includes(selectedZip) &&
    exampleZips.length < MAX_EXAMPLE_ZIPS;

  return (
    <div className="by-example" aria-label="By example similarity">
      <p className="by-example__intro">
        Pick a city archetype or pin ZIPs you like — matches update reactively with similarity
        scores.
      </p>

      <div className="by-example__archetypes" role="list" aria-label="City archetypes">
        {CITY_ARCHETYPES.map((archetype) => (
          <button
            key={archetype.id}
            type="button"
            role="listitem"
            className="by-example__archetype"
            onClick={() => onApplyArchetype?.(archetype.criteria)}
          >
            <span className="by-example__archetype-label">{archetype.label}</span>
            <span className="by-example__archetype-desc">{archetype.description}</span>
          </button>
        ))}
      </div>

      <div className="by-example__examples">
        {exampleZips.length === 0 ? (
          <p className="criteria-panel__empty">No pinned examples — select a ZIP on the map.</p>
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
