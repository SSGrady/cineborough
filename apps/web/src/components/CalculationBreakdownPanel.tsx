import type { CalculationBreakdown, PropertyRecord } from "@cineborough/data";
import { formatCurrency } from "@/lib/format";

interface CalculationBreakdownPanelProps {
  property: PropertyRecord;
  breakdown: CalculationBreakdown;
  renovationCost: number;
}

interface LineItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export function CalculationBreakdownPanel({
  property,
  breakdown,
  renovationCost,
}: CalculationBreakdownPanelProps) {
  const lineItems: LineItem[] = [
    { label: "Living area", value: `${property.sqft.toLocaleString()} sqft` },
    { label: "Market PSF (ZIP)", value: `$${breakdown.marketPsf}/sqft` },
    { label: "Similar homes PSF", value: `$${breakdown.similarHomesPsf}/sqft` },
    {
      label: "Forecast-adjusted market value",
      value: formatCurrency(breakdown.forecastAdjustedValue),
      highlight: true,
    },
    {
      label: "Purchase trend value",
      value: formatCurrency(breakdown.purchaseTrendValue),
      highlight: true,
    },
  ];

  if (renovationCost > 0) {
    lineItems.push({
      label: "Renovation budget",
      value: `−${formatCurrency(renovationCost)}`,
      highlight: true,
    });
  }

  return (
    <section className="calc-breakdown" aria-label="How we got there">
      <h3>How we got there</h3>
      <dl className="calc-breakdown__list">
        {lineItems.map((item) => (
          <div
            key={item.label}
            className={item.highlight ? "calc-breakdown__row calc-breakdown__row--highlight" : "calc-breakdown__row"}
          >
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
