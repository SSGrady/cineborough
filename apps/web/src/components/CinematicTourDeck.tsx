"use client";

import type { NeighborhoodPhoto, RankedNeighborhood } from "@cineborough/data";
import { formatPercent } from "@/lib/format";

interface CinematicTourDeckProps {
  neighborhood: RankedNeighborhood;
  index: number;
  total: number;
  phase: "flying" | "highlight";
  photo: NeighborhoodPhoto | null;
  quoteText?: string;
  primaryVibe?: string;
  onSkip: () => void;
}

export function CinematicTourDeck({
  neighborhood,
  index,
  total,
  phase,
  photo,
  quoteText,
  primaryVibe,
  onSkip,
}: CinematicTourDeckProps) {
  const { metrics: m } = neighborhood;
  const phaseLabel = phase === "flying" ? "Flying in…" : "Neighborhood spotlight";

  return (
    <div className="cinematic-deck" role="region" aria-label="Cinematic neighborhood tour">
      <div className="cinematic-deck__chrome">
        <span className="cinematic-deck__step">
          {index + 1} / {total}
        </span>
        <span className="cinematic-deck__phase">{phaseLabel}</span>
        <button type="button" className="cinematic-deck__skip" onClick={onSkip}>
          Skip tour
        </button>
      </div>

      <div className="cinematic-deck__bento">
        <figure className="cinematic-deck__photo" aria-label={`Photo for ${neighborhood.zip}`}>
          {photo ? (
            <img
              src={photo.url}
              alt={photo.alt}
              className="cinematic-deck__photo-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="cinematic-deck__photo-placeholder" aria-hidden="true" />
          )}
          {photo?.credit && (
            <figcaption className="cinematic-deck__photo-credit">{photo.credit}</figcaption>
          )}
        </figure>

        <div className="cinematic-deck__story">
          <div className="cinematic-deck__headline">
            <span className="cinematic-deck__rank">#{neighborhood.rank}</span>
            <h2 className="cinematic-deck__title">
              {neighborhood.zip} — {neighborhood.name}
            </h2>
            <p className="cinematic-deck__meta">
              {neighborhood.matchPercent}% match · forecast {formatPercent(m.homePriceForecast1yr)} ·
              walk {Math.round(m.walkabilityScore)}
            </p>
          </div>

          {(quoteText || primaryVibe) && (
            <blockquote className="cinematic-deck__quote">
              {primaryVibe && <p className="cinematic-deck__vibe">{primaryVibe}</p>}
              {quoteText && <p>&ldquo;{quoteText}&rdquo;</p>}
            </blockquote>
          )}

          <div className="cinematic-deck__milestones" aria-label="Tour progress">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`cinematic-deck__milestone${
                  i === index ? " cinematic-deck__milestone--active" : ""
                }${i < index ? " cinematic-deck__milestone--done" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
