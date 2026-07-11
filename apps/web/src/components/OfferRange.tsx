import type { ComputedOfferRanges } from "@cineborough/data";
import { offerVsListPct } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";

type OfferTier = "conservative" | "fair" | "competitive";

const TIER_LABELS: Record<OfferTier, string> = {
  conservative: "Conservative",
  fair: "Fair",
  competitive: "Competitive",
};

interface OfferRangeProps {
  offers: ComputedOfferRanges;
  activeTier?: OfferTier;
  onTierSelect?: (tier: OfferTier) => void;
}

export function OfferRange({ offers, activeTier = "fair", onTierSelect }: OfferRangeProps) {
  const tiers: OfferTier[] = ["conservative", "fair", "competitive"];

  return (
    <section className="offer-range" aria-label="Offer ranges">
      <header className="offer-range__header">
        <h3>Offer Range</h3>
        <p className="offer-range__list">
          vs List <strong>{formatCurrency(offers.listPrice)}</strong>
        </p>
      </header>

      <div className="offer-range__cards" role="group" aria-label="Offer tier cards">
        {tiers.map((tier) => {
          const amount = offers[tier];
          const vsList = offerVsListPct(amount, offers.listPrice);
          const isActive = activeTier === tier;

          return (
            <button
              key={tier}
              type="button"
              className={`offer-card${isActive ? " offer-card--active" : ""}`}
              onClick={() => onTierSelect?.(tier)}
              aria-pressed={isActive}
            >
              <span className="offer-card__label">{TIER_LABELS[tier]}</span>
              <span className="offer-card__amount">{formatCurrency(amount)}</span>
              <span className="offer-card__delta">{formatPercent(vsList)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
