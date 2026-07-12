"use client";

import { useMemo, useState } from "react";
import {
  type DcMetroGeoJson,
  type DiscoveryCriteria,
  type DiscoveryFilter,
  type DiscoveryFilterMetric,
  DEFAULT_DISCOVERY_CRITERIA,
  DISCOVERY_MATCH_THRESHOLD,
  countMatchingNeighborhoods,
  createDiscoveryFilter,
  getDiscoveryMetricDef,
  getDiscoveryMetricLabel,
} from "@cineborough/data";
import { CriterionRangeSlider } from "./CriterionRangeSlider";
import { CriterionCategoryPicker } from "./CriterionCategoryPicker";

interface CriteriaPanelProps {
  criteria: DiscoveryCriteria;
  resetCriteria?: DiscoveryCriteria;
  geoJson: DcMetroGeoJson | null;
  onChange: (criteria: DiscoveryCriteria) => void;
  onFindMatches: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function normalizeCriteria(criteria: DiscoveryCriteria): DiscoveryCriteria {
  return {
    filters: criteria.filters.map((filter) => {
      const def = getDiscoveryMetricDef(filter.metric);
      const next: DiscoveryFilter = { id: filter.id, metric: filter.metric };
      if (def.kind === "range" || def.kind === "min") {
        next.min = filter.min ?? def.defaultMin;
      }
      if (def.kind === "range" || def.kind === "max") {
        next.max = filter.max ?? def.defaultMax;
      }
      if (def.kind === "range" && next.min !== undefined && next.max !== undefined) {
        next.min = Math.min(next.min, next.max);
        next.max = Math.max(next.min, next.max);
      }
      return next;
    }),
  };
}

export function CriteriaPanel({
  criteria,
  resetCriteria = DEFAULT_DISCOVERY_CRITERIA,
  geoJson,
  onChange,
  onFindMatches,
  collapsed = false,
  onToggleCollapse,
}: CriteriaPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeMetrics = useMemo(
    () => new Set(criteria.filters.map((f) => f.metric)),
    [criteria.filters],
  );

  const matchPreview = useMemo(() => {
    if (!geoJson) return null;
    const normalized = normalizeCriteria(criteria);
    const count = countMatchingNeighborhoods(geoJson, normalized, DISCOVERY_MATCH_THRESHOLD);
    const total = geoJson.features.length;
    return { count, total };
  }, [geoJson, criteria]);

  const updateFilter = (
    id: string,
    patch: Partial<
      Pick<DiscoveryFilter, "min" | "max" | "priority" | "heatmapActive" | "sortMode">
    >,
  ) => {
    onChange({
      filters: criteria.filters.map((f) => {
        if (f.id !== id) {
          if (patch.heatmapActive && f.heatmapActive) {
            return { ...f, heatmapActive: false };
          }
          if (patch.sortMode && f.sortMode) {
            return { ...f, sortMode: false };
          }
          return f;
        }
        return { ...f, ...patch };
      }),
    });
  };

  const removeFilter = (id: string) => {
    onChange({
      filters: criteria.filters.filter((f) => f.id !== id),
    });
  };

  const addCriterion = (metric: DiscoveryFilterMetric) => {
    onChange({
      filters: [...criteria.filters, createDiscoveryFilter(metric, crypto.randomUUID())],
    });
  };

  const handleFindMatches = () => {
    onChange(normalizeCriteria(criteria));
    onFindMatches();
  };

  if (collapsed) {
    return (
      <aside className="criteria-panel criteria-panel--collapsed" aria-label="Your criteria">
        <button
          type="button"
          className="criteria-panel__expand"
          onClick={onToggleCollapse}
          aria-label="Expand criteria panel"
        >
          Criteria
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="criteria-panel" aria-label="Your criteria">
        <header className="criteria-panel__header">
          <h2>Your criteria</h2>
          {onToggleCollapse && (
            <button
              type="button"
              className="criteria-panel__collapse"
              onClick={onToggleCollapse}
              aria-label="Collapse criteria panel"
            >
              ‹
            </button>
          )}
        </header>

        <p className="criteria-panel__intro">
          Set what matters to you. Every neighborhood gets a Match&nbsp;%.
        </p>

        {matchPreview !== null && (
          <p className="criteria-panel__preview" aria-live="polite">
            {matchPreview.count} of {matchPreview.total} neighborhoods ≥{DISCOVERY_MATCH_THRESHOLD}% match
          </p>
        )}

        <div className="criteria-panel__cards">
          {criteria.filters.length === 0 ? (
            <p className="criteria-panel__empty">No criteria yet — add metrics that matter to you.</p>
          ) : (
            criteria.filters.map((filter) => (
              <article key={filter.id} className="criterion-card">
                <div className="criterion-card__header">
                  <span className="criterion-card__title">
                    {getDiscoveryMetricLabel(filter.metric)}
                  </span>
                  <button
                    type="button"
                    className="criterion-card__remove"
                    aria-label={`Remove ${getDiscoveryMetricLabel(filter.metric)}`}
                    onClick={() => removeFilter(filter.id)}
                  >
                    ×
                  </button>
                </div>
                <CriterionRangeSlider
                  filter={filter}
                  geoJson={geoJson}
                  onChange={(patch) => updateFilter(filter.id, patch)}
                />
                <div className="criterion-card__toggles" role="group" aria-label="Criterion controls">
                  <button
                    type="button"
                    className={`criterion-card__toggle${filter.heatmapActive ? " criterion-card__toggle--on" : ""}`}
                    aria-pressed={filter.heatmapActive ?? false}
                    onClick={() =>
                      updateFilter(filter.id, { heatmapActive: !filter.heatmapActive })
                    }
                  >
                    Heatmap
                  </button>
                  <button
                    type="button"
                    className={`criterion-card__toggle${filter.priority ? " criterion-card__toggle--on" : ""}`}
                    aria-pressed={filter.priority ?? false}
                    onClick={() => updateFilter(filter.id, { priority: !filter.priority })}
                  >
                    High Priority
                  </button>
                  <button
                    type="button"
                    className={`criterion-card__toggle${filter.sortMode ? " criterion-card__toggle--on" : ""}`}
                    aria-pressed={filter.sortMode ?? false}
                    onClick={() => updateFilter(filter.id, { sortMode: !filter.sortMode })}
                  >
                    Just This
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <button
          type="button"
          className="criteria-panel__add"
          onClick={() => setPickerOpen(true)}
        >
          + Add criterion
        </button>

        <div className="criteria-panel__actions">
          <button
            type="button"
            className="criteria-panel__reset"
            onClick={() => onChange(resetCriteria)}
          >
            Reset
          </button>
          <button type="button" className="criteria-panel__find" onClick={handleFindMatches}>
            Find matches
          </button>
        </div>
      </aside>

      <CriterionCategoryPicker
        open={pickerOpen}
        activeMetrics={activeMetrics}
        onSelect={addCriterion}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

/** @deprecated Use CriteriaPanel — shim for one sprint */
export { CriteriaPanel as DiscoveryCriteriaPanelShim };
