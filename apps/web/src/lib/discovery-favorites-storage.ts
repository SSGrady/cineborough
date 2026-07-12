const FAVORITES_KEY = "cineborough:discovery-favorites";

export function loadDiscoveryFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((z): z is string => typeof z === "string"));
  } catch {
    return new Set();
  }
}

export function saveDiscoveryFavorites(favorites: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    /* localStorage unavailable */
  }
}
