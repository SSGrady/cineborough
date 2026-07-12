import {
  DEFAULT_DISCOVERY_CRITERIA,
  DISCOVERY_CRITERIA_STORAGE_KEY,
  DISCOVERY_CRITERIA_STORAGE_VERSION,
  type DiscoveryCriteria,
  type DiscoveryFilter,
} from "@cineborough/data";

interface StoredDiscoveryCriteria {
  version: number;
  filters: DiscoveryFilter[];
}

function isDiscoveryFilter(value: unknown): value is DiscoveryFilter {
  if (typeof value !== "object" || value === null) return false;
  const f = value as DiscoveryFilter;
  return typeof f.id === "string" && typeof f.metric === "string";
}

function parseStoredCriteria(raw: string): DiscoveryCriteria | null {
  const parsed = JSON.parse(raw) as unknown;

  if (typeof parsed !== "object" || parsed === null) return null;

  if ("version" in parsed && "filters" in parsed) {
    const stored = parsed as StoredDiscoveryCriteria;
    if (
      stored.version === DISCOVERY_CRITERIA_STORAGE_VERSION &&
      Array.isArray(stored.filters) &&
      stored.filters.every(isDiscoveryFilter)
    ) {
      return { filters: stored.filters };
    }
  }

  // Legacy v1 flat shape — drop financial defaults; use new hope-core defaults.
  if ("budgetMin" in parsed || "minWalkability" in parsed) {
    return DEFAULT_DISCOVERY_CRITERIA;
  }

  if ("filters" in parsed && Array.isArray((parsed as DiscoveryCriteria).filters)) {
    const filters = (parsed as DiscoveryCriteria).filters.filter(isDiscoveryFilter);
    if (filters.length > 0) return { filters };
  }

  return null;
}

export function loadDiscoveryCriteria(): DiscoveryCriteria {
  if (typeof window === "undefined") return DEFAULT_DISCOVERY_CRITERIA;
  try {
    const raw = localStorage.getItem(DISCOVERY_CRITERIA_STORAGE_KEY);
    if (!raw) return DEFAULT_DISCOVERY_CRITERIA;
    return parseStoredCriteria(raw) ?? DEFAULT_DISCOVERY_CRITERIA;
  } catch {
    return DEFAULT_DISCOVERY_CRITERIA;
  }
}

export function saveDiscoveryCriteria(criteria: DiscoveryCriteria): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredDiscoveryCriteria = {
      version: DISCOVERY_CRITERIA_STORAGE_VERSION,
      filters: criteria.filters,
    };
    localStorage.setItem(DISCOVERY_CRITERIA_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage unavailable — criteria remain in React state only */
  }
}
