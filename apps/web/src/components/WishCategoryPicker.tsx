"use client";

import {
  type DiscoveryFilterMetric,
  WISH_CATEGORIES,
  getDiscoveryMetricLabel,
} from "@cineborough/data";

interface WishCategoryPickerProps {
  open: boolean;
  activeMetrics: Set<DiscoveryFilterMetric>;
  onSelect: (metric: DiscoveryFilterMetric) => void;
  onClose: () => void;
}

export function WishCategoryPicker({
  open,
  activeMetrics,
  onSelect,
  onClose,
}: WishCategoryPickerProps) {
  if (!open) return null;

  return (
    <div className="wish-picker" role="dialog" aria-label="Add a wish">
      <div className="wish-picker__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="wish-picker__panel">
        <header className="wish-picker__header">
          <h3>Add a Wish</h3>
          <button type="button" className="wish-picker__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="wish-picker__categories">
          {WISH_CATEGORIES.map((category) => (
            <section key={category.id} className="wish-picker__category">
              <h4>{category.label}</h4>
              {category.metrics.length === 0 ? (
                <p className="wish-picker__coming-soon">Coming soon</p>
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
                          {added && <span className="wish-picker__added">Added</span>}
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
