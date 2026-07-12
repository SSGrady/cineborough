"use client";

import { getLocaleQuote } from "@cineborough/data";
import { buildMapboxStaticImageUrl } from "@/lib/mapbox-static-image";
import { isSatelliteQuoteBgEnabled } from "@/lib/cinematic-flags";

interface LocaleQuoteCardProps {
  zip: string;
  quoteText?: string;
  primaryVibe?: string;
  source?: string;
  neighborhood?: string;
  mapCenter?: [number, number] | null;
}

export function LocaleQuoteCard({
  zip,
  quoteText,
  primaryVibe,
  source,
  neighborhood,
  mapCenter,
}: LocaleQuoteCardProps) {
  const fallback = getLocaleQuote(zip);
  const text = quoteText ?? fallback?.text;
  const vibe = primaryVibe ?? fallback?.primaryVibe;
  const cite = source ?? fallback?.source;
  const hood = neighborhood ?? fallback?.neighborhood ?? zip;

  if (!text) return null;

  const satelliteUrl =
    isSatelliteQuoteBgEnabled() && mapCenter
      ? buildMapboxStaticImageUrl({ center: mapCenter, zoom: 15, pitch: 45 })
      : null;

  return (
    <article
      className={`locale-quote${satelliteUrl ? " locale-quote--satellite" : ""}`}
      aria-label={`Community quote for ${hood}`}
    >
      {satelliteUrl ? (
        <div
          className="locale-quote__bg locale-quote__bg--satellite"
          style={{ backgroundImage: `url(${satelliteUrl})` }}
          aria-hidden="true"
        />
      ) : (
        <div className="locale-quote__bg" aria-hidden="true" />
      )}
      <div className="locale-quote__content">
        {vibe && <p className="locale-quote__vibe">{vibe}</p>}
        <blockquote>
          <p>&ldquo;{text}&rdquo;</p>
        </blockquote>
        <footer>
          <cite>{cite}</cite>
          <span className="locale-quote__neighborhood">{hood}</span>
        </footer>
      </div>
    </article>
  );
}
