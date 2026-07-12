"use client";

import { useEffect, useState } from "react";
import type { NeighborhoodPhoto } from "@cineborough/data";

interface NeighborhoodPhotoHeroProps {
  photo: NeighborhoodPhoto | null | undefined;
  visible?: boolean;
  zip?: string;
  neighborhood?: string;
}

export function NeighborhoodPhotoHero({
  photo,
  visible = false,
  zip,
  neighborhood,
}: NeighborhoodPhotoHeroProps) {
  const [displayed, setDisplayed] = useState<NeighborhoodPhoto | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!photo || !visible) {
      setFading(true);
      const timer = window.setTimeout(() => {
        setDisplayed(null);
        setFading(false);
      }, 400);
      return () => window.clearTimeout(timer);
    }

    if (displayed?.zip === photo.zip) {
      setFading(false);
      return;
    }

    setFading(true);
    const timer = window.setTimeout(() => {
      setDisplayed(photo);
      setFading(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [photo, visible, displayed?.zip]);

  if (!displayed) return null;

  const label = neighborhood ?? displayed.alt;

  return (
    <figure
      className={`photo-hero${visible && !fading ? " photo-hero--visible" : ""}${fading ? " photo-hero--fading" : ""}`}
      aria-label={`Neighborhood photography for ${zip ?? displayed.zip}`}
    >
      <img
        src={displayed.url}
        alt={displayed.alt}
        className="photo-hero__img"
        loading="lazy"
        decoding="async"
      />
      <figcaption className="photo-hero__caption">
        <span className="photo-hero__zip">{zip ?? displayed.zip}</span>
        <span className="photo-hero__label">{label}</span>
        <span className="photo-hero__credit">{displayed.credit}</span>
      </figcaption>
    </figure>
  );
}
