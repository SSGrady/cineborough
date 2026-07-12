/**
 * Phase 2b cinematic feature flags — see docs/specifications/phase-2-cinematic-ux.md
 * and ADR-008 amendment (Google 3D tiles gate).
 */

const TRUTHY = new Set(["1", "true", "yes", "on"]);

function envFlag(name: string): boolean {
  const raw = process.env[name];
  if (!raw) return false;
  return TRUTHY.has(raw.trim().toLowerCase());
}

/** Master switch for Google Photorealistic 3D Tiles (default off). */
export function is3DTilesFlagEnabled(): boolean {
  return envFlag("NEXT_PUBLIC_ENABLE_3D_TILES");
}

/** Google Maps Platform API key — required when 3D tiles flag is on. */
export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "your_google_maps_api_key_here") return null;
  return key;
}

/** True only when flag is on AND a valid API key is present. */
export function is3DTilesActive(): boolean {
  return is3DTilesFlagEnabled() && getGoogleMapsApiKey() !== null;
}

/** Phase 2b photography hero transitions (no paid API — uses mock/Unsplash assets). */
export function isPhotoHeroEnabled(): boolean {
  return envFlag("NEXT_PUBLIC_ENABLE_PHOTO_HERO") || !is3DTilesFlagEnabled();
}

/** Mapbox satellite backdrop on locale quote cards (uses existing MAPBOX token). */
export function isSatelliteQuoteBgEnabled(): boolean {
  return envFlag("NEXT_PUBLIC_ENABLE_SATELLITE_QUOTES") || true;
}

/** CSS stagger choreography for analytics cards (Framer Motion deferred per spec). */
export function isCinematicMotionEnabled(): boolean {
  return envFlag("NEXT_PUBLIC_ENABLE_CINEMATIC_MOTION") || true;
}
