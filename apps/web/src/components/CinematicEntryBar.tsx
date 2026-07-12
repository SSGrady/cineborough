"use client";

interface CinematicEntryBarProps {
  metroName: string;
  showStoryMode: boolean;
  onTourTopNeighborhoods: () => void;
  onStoryMode?: () => void;
}

export function CinematicEntryBar({
  metroName,
  showStoryMode,
  onTourTopNeighborhoods,
  onStoryMode,
}: CinematicEntryBarProps) {
  return (
    <div className="cinematic-entry" role="region" aria-label="Cinematic experiences">
      <p className="cinematic-entry__lead">
        <span className="cinematic-entry__metro">{metroName}</span>
        <span className="cinematic-entry__hint">Guided flyover with photos & analytics</span>
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
