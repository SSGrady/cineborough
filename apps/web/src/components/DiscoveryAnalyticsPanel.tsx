"use client";

import type { DiscoveryFilterMetric, RankedNeighborhood } from "@cineborough/data";
import { METRIC_PROVENANCE, getDiscoveryMetricLabel } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";

interface DiscoveryAnalyticsPanelProps {
  neighborhood: RankedNeighborhood;
  metroAvgPsf: number;
  /** Compact grid for map overlay; full layout for drawer */
  variant?: "overlay" | "drawer";
}

interface AnalyticsRow {
  key: keyof typeof METRIC_PROVENANCE;
  label: string;
  value: string;
}

function buildRows(
  neighborhood: RankedNeighborhood,
  metroAvgPsf: number,
): AnalyticsRow[] {
  const { metrics: m } = neighborhood;
  const psfVsMetro =
    metroAvgPsf > 0 ? ((m.marketPsf - metroAvgPsf) / metroAvgPsf) * 100 : 0;

  return [
    {
      key: "homePriceForecast1yr",
      label: "1-Yr Forecast",
      value: formatPercent(m.homePriceForecast1yr),
    },
    {
      key: "homeValueGrowthYoy",
      label: "Home Value YoY",
      value: formatPercent(m.homeValueGrowthYoy),
    },
    {
      key: "overvaluationPct",
      label: "Over / Undervaluation",
      value: formatPercent(m.overvaluationPct),
    },
    {
      key: "capRate",
      label: "Cap Rate",
      value: formatPercent(m.capRate),
    },
    {
      key: "marketPsf",
      label: "Market PSF",
      value: `$${Math.round(m.marketPsf)}/sqft (${formatPercent(psfVsMetro)} vs metro)`,
    },
    {
      key: "sellerDesperationScore",
      label: "Seller Desperation",
      value: `${Math.round(m.sellerDesperationScore)}/100`,
    },
    {
      key: "walkabilityScore",
      label: "Walk Score",
      value: `${Math.round(m.walkabilityScore)}/100`,
    },
    {
      key: "remoteWorkPct",
      label: "Remote Work",
      value: `${m.remoteWorkPct.toFixed(1)}%`,
    },
    {
      key: "medianHomeValue",
      label: "Median Home Value",
      value: formatCurrency(m.medianHomeValue),
    },
  ];
}

export function DiscoveryAnalyticsPanel({
  neighborhood,
  metroAvgPsf,
  variant = "drawer",
}: DiscoveryAnalyticsPanelProps) {
  const rows = buildRows(neighborhood, metroAvgPsf);
  const overlayRows = rows.slice(0, 6);

  return (
    <div className={`discovery-analytics discovery-analytics--${variant}`}>
      <header className="discovery-analytics__header">
        <div>
          <span className="discovery-analytics__rank">#{neighborhood.rank}</span>
          <h3>
            {neighborhood.zip} — {neighborhood.name}
          </h3>
        </div>
        <div className="discovery-analytics__score" aria-label={`Hybrid score ${neighborhood.score}`}>
          <span className="discovery-analytics__score-value">{neighborhood.score}</span>
          <span className="discovery-analytics__score-label">hybrid score</span>
        </div>
      </header>

      <dl className="discovery-analytics__grid">
        {(variant === "overlay" ? overlayRows : rows).map((row) => {
          const source = METRIC_PROVENANCE[row.key];
          return (
            <div key={row.key} className="discovery-analytics__cell">
              <dt>
                {row.label}
                <span
                  className={`discovery-analytics__badge discovery-analytics__badge--${source.provenance}`}
                  title={`Source: ${source.shortLabel}`}
                >
                  {source.shortLabel}
                </span>
              </dt>
              <dd>{row.value}</dd>
            </div>
          );
        })}
      </dl>

      {variant === "drawer" && (
        <section className="discovery-analytics__breakdown" aria-label="Score breakdown">
          <h4>Hybrid score breakdown</h4>
          <ul>
            {Object.entries(neighborhood.breakdown.byMetric).map(([metric, score]) => (
              <li key={metric}>
                {getDiscoveryMetricLabel(metric as DiscoveryFilterMetric)}{" "}
                <strong>{score?.toFixed(0)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
