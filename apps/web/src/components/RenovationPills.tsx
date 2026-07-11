import type { RenovationTierId } from "@cineborough/data";
import { RENOVATION_TIERS } from "@cineborough/data";

interface RenovationPillsProps {
  activeTier: RenovationTierId;
  onTierChange: (tier: RenovationTierId) => void;
}

function tierDescription(costPerSqft: number): string {
  if (costPerSqft === 0) return "as-is";
  return `+$${costPerSqft}/sf`;
}

export function RenovationPills({ activeTier, onTierChange }: RenovationPillsProps) {
  return (
    <section className="renovation-pills" aria-label="Renovation adjustment">
      <h3>Renovation</h3>
      <div className="renovation-pills__row" role="group" aria-label="Renovation tiers">
        {RENOVATION_TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            className={`reno-pill${activeTier === tier.id ? " reno-pill--active" : ""}`}
            onClick={() => onTierChange(tier.id)}
            aria-pressed={activeTier === tier.id}
          >
            <span className="reno-pill__label">{tier.label}</span>
            <span className="reno-pill__cost">{tierDescription(tier.costPerSqft)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
