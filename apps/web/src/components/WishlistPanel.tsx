"use client";

import { useEffect, useMemo, useState } from "react";
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
import { WishRangeSlider } from "./WishRangeSlider";
import { WishCategoryPicker } from "./WishCategoryPicker";

interface WishlistPanelProps {
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

export function WishlistPanel({
  criteria,
  resetCriteria = DEFAULT_DISCOVERY_CRITERIA,
  geoJson,
  onChange,
  onFindMatches,
  collapsed = false,
  onToggleCollapse,
}: WishlistPanelProps) {
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

  const updateFilter = (id: string, patch: Partial<Pick<DiscoveryFilter, "min" | "max">>) => {
    onChange({
      filters: criteria.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const removeFilter = (id: string) => {
    onChange({
      filters: criteria.filters.filter((f) => f.id !== id),
    });
  };

  const addWish = (metric: DiscoveryFilterMetric) => {
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
      <aside className="wishlist-panel wishlist-panel--collapsed" aria-label="Wishlist">
        <button
          type="button"
          className="wishlist-panel__expand"
          onClick={onToggleCollapse}
          aria-label="Expand wishlist"
        >
          Wishes
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="wishlist-panel" aria-label="My Wishes">
        <header className="wishlist-panel__header">
          <h2>My Wishes</h2>
          {onToggleCollapse && (
            <button
              type="button"
              className="wishlist-panel__collapse"
              onClick={onToggleCollapse}
              aria-label="Collapse wishlist"
            >
              ‹
            </button>
          )}
        </header>

        <p className="wishlist-panel__intro">
          Add what matters to you. Every neighborhood gets a Match&nbsp;%.
        </p>

        {matchPreview !== null && (
          <p className="wishlist-panel__preview" aria-live="polite">
            {matchPreview.count} of {matchPreview.total} neighborhoods ≥{DISCOVERY_MATCH_THRESHOLD}%
          </p>
        )}

        <div className="wishlist-panel__cards">
          {criteria.filters.length === 0 ? (
            <p className="wishlist-panel__empty">No wishes yet — add what matters to you.</p>
          ) : (
            criteria.filters.map((filter) => (
              <article key={filter.id} className="wish-card">
                <div className="wish-card__header">
                  <span className="wish-card__title">
                    {getDiscoveryMetricLabel(filter.metric)}
                  </span>
                  <button
                    type="button"
                    className="wish-card__remove"
                    aria-label={`Remove ${getDiscoveryMetricLabel(filter.metric)}`}
                    onClick={() => removeFilter(filter.id)}
                  >
                    ×
                  </button>
                </div>
                <WishRangeSlider
                  filter={filter}
                  geoJson={geoJson}
                  onChange={(patch) => updateFilter(filter.id, patch)}
                />
              </article>
            ))
          )}
        </div>

        <button
          type="button"
          className="wishlist-panel__add"
          onClick={() => setPickerOpen(true)}
        >
          + Add a Wish
        </button>

        <div className="wishlist-panel__actions">
          <button
            type="button"
            className="wishlist-panel__reset"
            onClick={() => onChange(resetCriteria)}
          >
            Reset
          </button>
          <button type="button" className="wishlist-panel__find" onClick={handleFindMatches}>
            Find matches
          </button>
        </div>
      </aside>

      <WishCategoryPicker
        open={pickerOpen}
        activeMetrics={activeMetrics}
        onSelect={addWish}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

/** @deprecated Use WishlistPanel — shim for one sprint */
export { WishlistPanel as DiscoveryCriteriaPanelShim };
