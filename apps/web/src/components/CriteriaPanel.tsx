"use client";

import { forwardRef, useMemo, useState } from "react";
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
  getDiscoveryMetricHelperText,
} from "@cineborough/data";
import { CriterionRangeSlider } from "./CriterionRangeSlider";
import { CriterionCategoryPicker } from "./CriterionCategoryPicker";
import { ByExamplePanel } from "./ByExamplePanel";

type CriteriaPanelTab = "criteria" | "by-example";

interface CriteriaPanelProps {
  criteria: DiscoveryCriteria;
  resetCriteria?: DiscoveryCriteria;
  geoJson: DcMetroGeoJson | null;
  onChange: (criteria: DiscoveryCriteria) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  exampleZips?: string[];
  selectedZip?: string | null;
  zipLabels?: Map<string, string>;
  onAddExample?: (zip: string) => void;
  onRemoveExample?: (zip: string) => void;
  nationalMode?: boolean;
  nationalMetroCount?: number;
  matchCount?: number;
  matchingInFlight?: boolean;
  onApplyArchetype?: (criteria: DiscoveryCriteria) => void;
  /** Fired when criteria should trigger a rank pass (slider release, add/remove, etc.). */
  onCriteriaCommit?: () => void;
}

function normalizeCriteria(criteria: DiscoveryCriteria): DiscoveryCriteria {
  return {
    filters: criteria.filters.map((filter) => {
      const def = getDiscoveryMetricDef(filter.metric);
      const next: DiscoveryFilter = { id: filter.id, metric: filter.metric };
      next.min = filter.min ?? def.defaultMin ?? 0;
      next.max = filter.max ?? def.defaultMax ?? next.min;
      next.min = Math.min(next.min, next.max);
      next.max = Math.max(next.min, next.max);
      if (filter.priority) next.priority = true;
      if (filter.heatmapActive) next.heatmapActive = true;
      if (filter.sortMode) next.sortMode = true;
      return next;
    }),
  };
}

export const CriteriaPanel = forwardRef<HTMLElement, CriteriaPanelProps>(function CriteriaPanel(
  {
    criteria,
    resetCriteria = DEFAULT_DISCOVERY_CRITERIA,
    geoJson,
    onChange,
    collapsed = false,
    onToggleCollapse,
    exampleZips = [],
    selectedZip = null,
    zipLabels = new Map(),
    onAddExample,
    onRemoveExample,
    nationalMode = false,
    nationalMetroCount = 0,
    matchCount = 0,
    matchingInFlight = false,
    onApplyArchetype,
    onCriteriaCommit,
  },
  ref,
) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CriteriaPanelTab>("criteria");

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

  const emitChange = (next: DiscoveryCriteria, commit = false) => {
    onChange(normalizeCriteria(next));
    if (commit) onCriteriaCommit?.();
  };

  const commitChange = (next: DiscoveryCriteria) => {
    emitChange(next, true);
  };

  const updateFilter = (
    id: string,
    patch: Partial<
      Pick<DiscoveryFilter, "min" | "max" | "priority" | "heatmapActive" | "sortMode">
    >,
  ) => {
    emitChange({
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
    commitChange({
      filters: criteria.filters.filter((f) => f.id !== id),
    });
  };

  const addCriterion = (metric: DiscoveryFilterMetric) => {
    commitChange({
      filters: [...criteria.filters, createDiscoveryFilter(metric, crypto.randomUUID())],
    });
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
      <aside
        ref={ref}
        className="criteria-panel"
        aria-label="Your criteria"
        tabIndex={-1}
      >
        <header className="criteria-panel__header">
          <div className="criteria-panel__header-main">
            <h2>Your criteria</h2>
            <span
              className={`criteria-panel__match-ticker${matchingInFlight ? " criteria-panel__match-ticker--loading" : ""}`}
              role="status"
              aria-live="polite"
            >
              {matchingInFlight ? (
                "Matching…"
              ) : criteria.filters.length === 0 ? (
                "Add criteria"
              ) : (
                `🍿 ${matchCount} match${matchCount === 1 ? "" : "es"}`
              )}
            </span>
          </div>
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

        <div className="criteria-panel__tabs" role="tablist" aria-label="Discovery mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "criteria"}
            className={`criteria-panel__tab${activeTab === "criteria" ? " criteria-panel__tab--active" : ""}`}
            onClick={() => setActiveTab("criteria")}
          >
            Criteria
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "by-example"}
            className={`criteria-panel__tab${activeTab === "by-example" ? " criteria-panel__tab--active" : ""}`}
            onClick={() => setActiveTab("by-example")}
          >
            By Example
          </button>
        </div>

        {activeTab === "by-example" ? (
          <ByExamplePanel
            exampleZips={exampleZips}
            selectedZip={selectedZip}
            zipLabels={zipLabels}
            onAdd={(zip) => onAddExample?.(zip)}
            onRemove={(zip) => onRemoveExample?.(zip)}
            onApplyArchetype={onApplyArchetype}
          />
        ) : (
          <>
            {nationalMode ? (
              <p className="criteria-panel__intro" role="status">
                Matches update live across{" "}
                {nationalMetroCount > 0 ? `${nationalMetroCount} metros` : "all ingested metros"}.
              </p>
            ) : (
              <p className="criteria-panel__intro">
                Drag sliders or tap histogram bars — matches update automatically.
              </p>
            )}

            {matchPreview !== null && (
              <p className="criteria-panel__preview" aria-live="polite">
                {matchPreview.count} of {matchPreview.total} in metro ≥{DISCOVERY_MATCH_THRESHOLD}%
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
                    {getDiscoveryMetricHelperText(filter.metric) && (
                      <p className="criterion-card__helper">
                        {getDiscoveryMetricHelperText(filter.metric)}
                      </p>
                    )}
                    <CriterionRangeSlider
                      filter={filter}
                      geoJson={geoJson}
                      heatmapActive={filter.heatmapActive}
                      onChange={(patch) => updateFilter(filter.id, patch)}
                      onChangeEnd={onCriteriaCommit}
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
                        onClick={() =>
                          updateFilter(filter.id, { sortMode: !filter.sortMode })
                        }
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
          </>
        )}

        <div className="criteria-panel__actions">
          <button
            type="button"
            className="criteria-panel__reset"
            onClick={() => emitChange(resetCriteria)}
          >
            Reset
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
});

/** @deprecated Use CriteriaPanel — shim for one sprint */
export { CriteriaPanel as DiscoveryCriteriaPanelShim };
