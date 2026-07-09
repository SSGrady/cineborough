"use client";

import { getLocaleQuote } from "@cineborough/data";

interface LocaleQuoteCardProps {
  zip: string;
  /** Override from unified GeoJSON feature properties */
  quoteText?: string;
  primaryVibe?: string;
  source?: string;
  neighborhood?: string;
}

export function LocaleQuoteCard({
  zip,
  quoteText,
  primaryVibe,
  source,
  neighborhood,
}: LocaleQuoteCardProps) {
  const fallback = getLocaleQuote(zip);
  const text = quoteText ?? fallback?.text;
  const vibe = primaryVibe ?? fallback?.primaryVibe;
  const cite = source ?? fallback?.source;
  const hood = neighborhood ?? fallback?.neighborhood ?? zip;

  if (!text) return null;

  return (
    <article className="locale-quote" aria-label={`Community quote for ${hood}`}>
      <div className="locale-quote__bg" aria-hidden="true" />
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
