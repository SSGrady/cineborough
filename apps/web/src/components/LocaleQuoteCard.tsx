"use client";

import { getLocaleQuote } from "@cineborough/data";

interface LocaleQuoteCardProps {
  zip: string;
}

export function LocaleQuoteCard({ zip }: LocaleQuoteCardProps) {
  const quote = getLocaleQuote(zip);

  if (!quote) return null;

  return (
    <article className="locale-quote" aria-label={`Community quote for ${quote.neighborhood}`}>
      <div className="locale-quote__bg" aria-hidden="true" />
      <div className="locale-quote__content">
        <blockquote>
          <p>&ldquo;{quote.text}&rdquo;</p>
        </blockquote>
        <footer>
          <cite>{quote.source}</cite>
          <span className="locale-quote__neighborhood">{quote.neighborhood}</span>
        </footer>
      </div>
    </article>
  );
}
