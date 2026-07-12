import { MAX_EXAMPLE_ZIPS } from "@cineborough/data";

export const DISCOVERY_EXAMPLES_STORAGE_KEY = "cineborough:discovery-examples";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function loadDiscoveryExamples(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISCOVERY_EXAMPLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!isStringArray(parsed)) return [];
    return parsed.slice(0, MAX_EXAMPLE_ZIPS);
  } catch {
    return [];
  }
}

export function saveDiscoveryExamples(zips: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DISCOVERY_EXAMPLES_STORAGE_KEY,
      JSON.stringify(zips.slice(0, MAX_EXAMPLE_ZIPS)),
    );
  } catch {
    /* localStorage unavailable */
  }
}
