"use client";

interface ExploreCityBarProps {
  metroName: string;
  loading?: boolean;
  onExploreCity: () => void;
  onDismiss?: () => void;
}

export function ExploreCityBar({
  metroName,
  loading = false,
  onExploreCity,
  onDismiss,
}: ExploreCityBarProps) {
  return (
    <div className="cinematic-entry" role="region" aria-label="Explore city">
      <p className="cinematic-entry__lead">
        <span className="cinematic-entry__metro">{metroName}</span>
        <span className="cinematic-entry__hint">
          Metro selected · load neighborhood boundaries on demand
        </span>
      </p>
      <div className="cinematic-entry__actions">
        <button
          type="button"
          className="cinematic-entry__btn cinematic-entry__btn--primary"
          onClick={onExploreCity}
          disabled={loading}
        >
          {loading ? "Loading…" : "Explore city"}
        </button>
        {onDismiss && (
          <button
            type="button"
            className="cinematic-entry__btn cinematic-entry__btn--secondary"
            onClick={onDismiss}
            disabled={loading}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
