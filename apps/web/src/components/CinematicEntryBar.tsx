"use client";

interface CinematicEntryBarProps {
  metroName: string;
  showStoryMode: boolean;
  onTourTopNeighborhoods: () => void;
  onStoryMode?: () => void;
  /** When true, bar is a non-blocking optional flyover CTA (discovery already open). */
  optional?: boolean;
}

export function CinematicEntryBar({
  metroName,
  showStoryMode,
  onTourTopNeighborhoods,
  onStoryMode,
  optional = false,
}: CinematicEntryBarProps) {
  return (
    <div
      className={`cinematic-entry${optional ? " cinematic-entry--optional" : ""}`}
      role="region"
      aria-label="Cinematic experiences"
    >
      <p className="cinematic-entry__lead">
        <span className="cinematic-entry__metro">{metroName}</span>
        <span className="cinematic-entry__hint">
          {optional
            ? "Optional cinematic flyover with photos & analytics"
            : "Guided flyover with photos & analytics"}
        </span>
      </p>
      <div className="cinematic-entry__actions">
        <button
          type="button"
          className="cinematic-entry__btn cinematic-entry__btn--primary"
          onClick={onTourTopNeighborhoods}
        >
          Tour top neighborhoods
        </button>
        {showStoryMode && onStoryMode && (
          <button
            type="button"
            className="cinematic-entry__btn cinematic-entry__btn--secondary"
            onClick={onStoryMode}
          >
            Story mode
          </button>
        )}
      </div>
    </div>
  );
}
