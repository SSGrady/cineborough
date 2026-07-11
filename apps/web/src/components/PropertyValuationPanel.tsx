"use client";

import { useMemo, useState } from "react";
import type { PropertyRecord, RenovationTierId } from "@cineborough/data";
import { computeOfferRanges, formatPropertyAddress } from "@cineborough/data";
import { formatCurrency } from "@/lib/format";
import { OfferRange } from "./OfferRange";
import { RenovationPills } from "./RenovationPills";
import { CalculationBreakdownPanel } from "./CalculationBreakdownPanel";
import { ComparableSalesTable } from "./ComparableSalesTable";

interface PropertyValuationPanelProps {
  property: PropertyRecord;
  onBack: () => void;
}

export function PropertyValuationPanel({ property, onBack }: PropertyValuationPanelProps) {
  const [renovationTier, setRenovationTier] = useState<RenovationTierId>("off");
  const [activeOfferTier, setActiveOfferTier] = useState<"conservative" | "fair" | "competitive">("fair");

  const offers = useMemo(
    () => computeOfferRanges(property, renovationTier),
    [property, renovationTier],
  );

  return (
    <section className="property-valuation" aria-label="Property valuation">
      <header className="property-valuation__header">
        <div>
          <button type="button" className="property-valuation__back" onClick={onBack}>
            ← Back to ZIP
          </button>
          <h2>{formatPropertyAddress(property)}</h2>
          <p className="property-valuation__meta">
            {property.bedrooms} bd · {property.bathrooms} ba · {property.sqft.toLocaleString()} sqft
            {" · "}List {formatCurrency(property.listPrice)}
          </p>
        </div>
      </header>

      <div className="property-valuation__stack">
        <RenovationPills activeTier={renovationTier} onTierChange={setRenovationTier} />
        <OfferRange
          offers={offers}
          activeTier={activeOfferTier}
          onTierSelect={setActiveOfferTier}
        />
        <CalculationBreakdownPanel
          property={property}
          breakdown={property.breakdown}
          renovationCost={offers.renovationCost}
        />
        <ComparableSalesTable comparables={property.comparables} />
      </div>
    </section>
  );
}
