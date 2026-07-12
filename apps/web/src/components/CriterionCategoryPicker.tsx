"use client";

import {
  type DiscoveryFilterMetric,
  CRITERION_CATEGORIES,
  getDiscoveryMetricLabel,
} from "@cineborough/data";

interface CriterionCategoryPickerProps {
  open: boolean;
  activeMetrics: Set<DiscoveryFilterMetric>;
  onSelect: (metric: DiscoveryFilterMetric) => void;
  onClose: () => void;
}

export function CriterionCategoryPicker({
  open,
  activeMetrics,
  onSelect,
  onClose,
}: CriterionCategoryPickerProps) {
  if (!open) return null;

  return (
    <div className="criterion-picker" role="dialog" aria-label="Add a criterion">
      <div className="criterion-picker__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="criterion-picker__panel">
        <header className="criterion-picker__header">
          <h3>Add criterion</h3>
          <button type="button" className="criterion-picker__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="criterion-picker__categories">
          {CRITERION_CATEGORIES.map((category) => (
            <section key={category.id} className="criterion-picker__category">
              <h4>{category.label}</h4>
              {category.metrics.length === 0 ? (
                <p className="criterion-picker__coming-soon">Coming soon</p>
              ) : (
                <ul>
                  {category.metrics.map((metric) => {
                    const added = activeMetrics.has(metric);
                    return (
                      <li key={metric}>
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => {
                            onSelect(metric);
                            onClose();
                          }}
                        >
                          {getDiscoveryMetricLabel(metric)}
                          {added && <span className="criterion-picker__added">Added</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
