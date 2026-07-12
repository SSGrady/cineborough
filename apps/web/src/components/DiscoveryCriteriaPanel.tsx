"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DcMetroGeoJson,
  type DiscoveryCriteria,
  type DiscoveryFilter,
  type DiscoveryFilterMetric,
  DEFAULT_DISCOVERY_CRITERIA,
  DISCOVERY_FILTER_METRICS,
  DISCOVERY_MATCH_THRESHOLD,
  countMatchingNeighborhoods,
  createDiscoveryFilter,
  getDiscoveryMetricDef,
  getDiscoveryMetricLabel,
  getDiscoveryMetricUnit,
} from "@cineborough/data";
import { StoryDrawer } from "./StoryDrawer";

interface DiscoveryCriteriaPanelProps {
  open: boolean;
  criteria: DiscoveryCriteria;
  resetCriteria?: DiscoveryCriteria;
  geoJson?: DcMetroGeoJson | null;
  onClose: () => void;
  onApply: (criteria: DiscoveryCriteria) => void;
}

function formatBudget(value: number): string {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(2)}M`
    : `${Math.round(value / 1000)}k`;
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

export function DiscoveryCriteriaPanel({
  open,
  criteria,
  resetCriteria = DEFAULT_DISCOVERY_CRITERIA,
  geoJson = null,
  onClose,
  onApply,
}: DiscoveryCriteriaPanelProps) {
  const [draft, setDraft] = useState<DiscoveryCriteria>(criteria);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(criteria);
      setAddMenuOpen(false);
    }
  }, [open, criteria]);

  const activeMetrics = useMemo(
    () => new Set(draft.filters.map((f) => f.metric)),
    [draft.filters],
  );

  const availableMetrics = useMemo(
    () => DISCOVERY_FILTER_METRICS.filter((metric) => !activeMetrics.has(metric)),
    [activeMetrics],
  );

  const matchPreview = useMemo(() => {
    if (!geoJson) return null;
    const normalized = normalizeCriteria(draft);
    const count = countMatchingNeighborhoods(geoJson, normalized, DISCOVERY_MATCH_THRESHOLD);
    const total = geoJson.features.length;
    return { count, total };
  }, [geoJson, draft]);

  const updateFilter = (id: string, patch: Partial<Pick<DiscoveryFilter, "min" | "max">>) => {
    setDraft((prev) => ({
      filters: prev.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const removeFilter = (id: string) => {
    setDraft((prev) => ({
      filters: prev.filters.filter((f) => f.id !== id),
    }));
  };

  const addFilter = (metric: DiscoveryFilterMetric) => {
    setDraft((prev) => ({
      filters: [...prev.filters, createDiscoveryFilter(metric, crypto.randomUUID())],
    }));
    setAddMenuOpen(false);
  };

  const handleApply = () => {
    onApply(normalizeCriteria(draft));
    onClose();
  };

  return (
    <StoryDrawer open={open} title="Discovery criteria" onClose={onClose}>
      <p className="discovery-criteria__intro">
        Add the metrics that matter to you. Each active filter contributes to a match percentage —
        neighborhoods need not be perfect fits to appear in results.
      </p>

      {matchPreview !== null && (
        <p
          className={`discovery-criteria__preview${matchPreview.count === 0 ? " discovery-criteria__preview--empty" : ""}`}
          aria-live="polite"
        >
          {matchPreview.count === 0
            ? `No neighborhoods match (below ${DISCOVERY_MATCH_THRESHOLD}% threshold)`
            : `${matchPreview.count} neighborhood${matchPreview.count === 1 ? "" : "s"} match`}
          <span className="discovery-criteria__preview-meta">
            {" "}
            · {matchPreview.total} in metro · ≥{DISCOVERY_MATCH_THRESHOLD}% match
          </span>
        </p>
      )}

      {draft.filters.length === 0 ? (
        <p className="discovery-criteria__empty">No active filters — all neighborhoods qualify.</p>
      ) : (
        <ul className="discovery-criteria__list">
          {draft.filters.map((filter) => {
            const def = getDiscoveryMetricDef(filter.metric);
            const label = getDiscoveryMetricLabel(filter.metric);
            const unit = getDiscoveryMetricUnit(filter.metric);

            return (
              <li key={filter.id} className="discovery-criteria__row">
                <div className="discovery-criteria__row-header">
                  <span className="discovery-criteria__chip">{label}</span>
                  <button
                    type="button"
                    className="discovery-criteria__remove"
                    aria-label={`Remove ${label} filter`}
                    onClick={() => removeFilter(filter.id)}
                  >
                    ×
                  </button>
                </div>

                {def.kind === "range" ? (
                  <div className="discovery-criteria__range">
                    <label>
                      Min ({unit || "$"})
                      <input
                        type="number"
                        min={0}
                        step={def.step}
                        value={filter.min ?? ""}
                        onChange={(e) =>
                          updateFilter(filter.id, { min: Number(e.target.value) })
                        }
                      />
                      {filter.metric === "medianHomeValue" && filter.min !== undefined && (
                        <span className="discovery-criteria__hint">
                          {formatBudget(filter.min)}
                        </span>
                      )}
                    </label>
                    <label>
                      Max ({unit || "$"})
                      <input
                        type="number"
                        min={0}
                        step={def.step}
                        value={filter.max ?? ""}
                        onChange={(e) =>
                          updateFilter(filter.id, { max: Number(e.target.value) })
                        }
                      />
                      {filter.metric === "medianHomeValue" && filter.max !== undefined && (
                        <span className="discovery-criteria__hint">
                          {formatBudget(filter.max)}
                        </span>
                      )}
                    </label>
                  </div>
                ) : def.kind === "min" ? (
                  <label>
                    Min {unit && `(${unit})`}
                    <input
                      type="number"
                      step={def.step}
                      value={filter.min ?? ""}
                      onChange={(e) => updateFilter(filter.id, { min: Number(e.target.value) })}
                    />
                  </label>
                ) : (
                  <label>
                    Max {unit && `(${unit})`}
                    <input
                      type="number"
                      step={def.step}
                      value={filter.max ?? ""}
                      onChange={(e) => updateFilter(filter.id, { max: Number(e.target.value) })}
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="discovery-criteria__add">
        <button
          type="button"
          className="discovery-criteria__add-btn"
          aria-expanded={addMenuOpen}
          disabled={availableMetrics.length === 0}
          onClick={() => setAddMenuOpen((v) => !v)}
        >
          + Add filter
        </button>
        {addMenuOpen && availableMetrics.length > 0 && (
          <ul className="discovery-criteria__add-menu" role="listbox">
            {availableMetrics.map((metric) => (
              <li key={metric}>
                <button type="button" onClick={() => addFilter(metric)}>
                  {getDiscoveryMetricLabel(metric)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="discovery-criteria__actions">
        <button
          type="button"
          className="discovery-criteria__reset"
          onClick={() => setDraft(resetCriteria)}
        >
          Reset defaults
        </button>
        <button type="button" className="discovery-criteria__apply" onClick={handleApply}>
          Apply criteria
        </button>
      </div>
    </StoryDrawer>
  );
}
