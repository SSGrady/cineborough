import photos from "../../../data/mock/neighborhood-photos.json";

export interface NeighborhoodPhoto {
  zip: string;
  url: string;
  alt: string;
  credit: string;
}

const PHOTO_BY_ZIP = new Map(
  photos.photos.map((p) => [p.zip, p as NeighborhoodPhoto]),
);

/** Mock 4K neighborhood hero photography — Phase 2b T064 (no paid API). */
export function getNeighborhoodPhoto(zip: string): NeighborhoodPhoto | undefined {
  return PHOTO_BY_ZIP.get(zip);
}

export function listNeighborhoodPhotos(): NeighborhoodPhoto[] {
  return photos.photos as NeighborhoodPhoto[];
}
