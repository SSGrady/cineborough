import propertiesData from "../../../data/mock/properties.json";
import type {
  ComputedOfferRanges,
  PropertyCollection,
  PropertyRecord,
  RenovationTierId,
} from "./types";
import { RENOVATION_TIERS } from "./types";

export function loadMockProperties(): PropertyCollection {
  return propertiesData as unknown as PropertyCollection;
}

export function getPropertyById(id: string): PropertyRecord | undefined {
  return loadMockProperties().properties.find((p) => p.id === id);
}

export function getPropertiesByZip(zipCode: string): PropertyRecord[] {
  return loadMockProperties().properties.filter((p) => p.zipCode === zipCode);
}

export function getRenovationCost(sqft: number, tier: RenovationTierId): number {
  const tierDef = RENOVATION_TIERS.find((t) => t.id === tier);
  return (tierDef?.costPerSqft ?? 0) * sqft;
}

/** Subtract renovation budget from as-is offers (buyer reserves reno spend). */
export function computeOfferRanges(
  property: PropertyRecord,
  tier: RenovationTierId = "off",
): ComputedOfferRanges {
  const renovationCost = getRenovationCost(property.sqft, tier);
  const base = property.offerRangesAsIs;

  return {
    conservative: base.conservative - renovationCost,
    fair: base.fair - renovationCost,
    competitive: base.competitive - renovationCost,
    listPrice: property.listPrice,
    renovationCost,
  };
}

export function offerVsListPct(offer: number, listPrice: number): number {
  if (listPrice === 0) return 0;
  return ((offer - listPrice) / listPrice) * 100;
}

export function formatPropertyAddress(property: PropertyRecord): string {
  return `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;
}
