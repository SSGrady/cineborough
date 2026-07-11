import {
  DEFAULT_DISCOVERY_CRITERIA,
  DISCOVERY_CRITERIA_STORAGE_KEY,
  type DiscoveryCriteria,
} from "@cineborough/data";

export function loadDiscoveryCriteria(): DiscoveryCriteria {
  if (typeof window === "undefined") return DEFAULT_DISCOVERY_CRITERIA;
  try {
    const raw = sessionStorage.getItem(DISCOVERY_CRITERIA_STORAGE_KEY);
    if (!raw) return DEFAULT_DISCOVERY_CRITERIA;
    const parsed = JSON.parse(raw) as Partial<DiscoveryCriteria>;
    return { ...DEFAULT_DISCOVERY_CRITERIA, ...parsed };
  } catch {
    return DEFAULT_DISCOVERY_CRITERIA;
  }
}

export function saveDiscoveryCriteria(criteria: DiscoveryCriteria): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISCOVERY_CRITERIA_STORAGE_KEY, JSON.stringify(criteria));
  } catch {
    /* sessionStorage unavailable — criteria remain in React state only */
  }
}
