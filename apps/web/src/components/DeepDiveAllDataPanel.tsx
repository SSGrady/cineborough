import type { ReactNode } from "react";
import type { DcMetroFeatureProperties, ZipMetrics } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { HomeValueSparkline, generateHomeValueSparkline } from "./HomeValueSparkline";

interface MetricRow {
  key: string;
  label: string;
  value: string;
  context?: string;
  trend?: "up" | "down" | "neutral";
  sparkline?: ReactNode;
}

interface MetricSection {
  title: string;
  rows: MetricRow[];
}

interface DeepDiveAllDataPanelProps {
  zip: ZipMetrics;
  metroAvgPsf: number;
  featureProps?: DcMetroFeatureProperties;
}

function trendArrow(trend: MetricRow["trend"]): string | null {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return null;
}

function trendClass(trend: MetricRow["trend"]): string {
  if (trend === "up") return "deep-dive__metric-trend--up";
  if (trend === "down") return "deep-dive__metric-trend--down";
  return "deep-dive__metric-trend--neutral";
}

function buildMetricSections(
  zip: ZipMetrics,
  metroAvgPsf: number,
  featureProps?: DcMetroFeatureProperties,
): MetricSection[] {
  const psfVsMarket =
    metroAvgPsf > 0 ? ((zip.marketPsf - metroAvgPsf) / metroAvgPsf) * 100 : 0;
  const forecastPct = featureProps?.oneYearForecastPct ?? zip.homePriceForecast1yr;
  const walkScore = featureProps?.walkScore ?? zip.walkabilityScore;
  const sparklineValues = generateHomeValueSparkline(zip.medianHomeValue, zip.homeValueGrowthYoy);

  return [
    {
      title: "Investor signals",
      rows: [
        {
          key: "forecast",
          label: "1-Year Forecast",
          value: formatPercent(forecastPct),
          trend: forecastPct > 0 ? "up" : forecastPct < 0 ? "down" : "neutral",
        },
        {
          key: "median-home-value",
          label: "Median Home Value",
          value: formatCurrency(zip.medianHomeValue),
          context: `${formatPercent(zip.homeValueGrowthYoy)} YoY`,
          trend: zip.homeValueGrowthYoy > 0 ? "up" : zip.homeValueGrowthYoy < 0 ? "down" : "neutral",
          sparkline: <HomeValueSparkline values={sparklineValues} compact />,
        },
        {
          key: "cap-rate",
          label: "Cap Rate",
          value: formatPercent(zip.capRate),
        },
        {
          key: "days-on-market",
          label: "Days on Market",
          value: `${zip.daysOnMarket}`,
          context: "days",
        },
        {
          key: "seller-desperation",
          label: "Seller Desperation",
          value: `${zip.sellerDesperationScore}`,
          context: "/ 100",
        },
        {
          key: "overvaluation",
          label: "Over / Undervaluation",
          value: formatPercent(zip.overvaluationPct),
          trend: zip.overvaluationPct > 0 ? "up" : zip.overvaluationPct < 0 ? "down" : "neutral",
        },
        {
          key: "market-psf",
          label: "Market PSF",
          value: `$${zip.marketPsf}/sqft`,
          context: `${formatPercent(psfVsMarket)} vs metro`,
        },
      ],
    },
    {
      title: "Hope-core",
      rows: [
        {
          key: "opportunity",
          label: "Opportunity Index",
          value: zip.opportunityScoreNormalized?.toFixed(0) ?? "—",
          context: "/ 100",
        },
        {
          key: "remote-work",
          label: "Remote Work %",
          value: `${zip.remoteWorkPct.toFixed(1)}%`,
        },
        {
          key: "walk-score",
          label: "Walk Score",
          value: `${walkScore}`,
          context: "/ 100",
        },
        {
          key: "homeowners-25-44",
          label: "Homeowners 25–44 %",
          value: `${zip.homeowners25to44Pct.toFixed(1)}%`,
        },
        {
          key: "median-age",
          label: "Median Age",
          value: `${zip.medianAge.toFixed(1)}`,
          context: "yrs",
        },
        {
          key: "population-growth",
          label: "Population Growth",
          value: formatPercent(zip.populationGrowthRate),
          trend:
            zip.populationGrowthRate > 0
              ? "up"
              : zip.populationGrowthRate < 0
                ? "down"
                : "neutral",
        },
        {
          key: "college-degree",
          label: "College Degree Rate",
          value: `${zip.collegeDegreeRate.toFixed(1)}%`,
        },
      ],
    },
  ];
}

export function DeepDiveAllDataPanel({
  zip,
  metroAvgPsf,
  featureProps,
}: DeepDiveAllDataPanelProps) {
  const sections = buildMetricSections(zip, metroAvgPsf, featureProps);

  return (
    <div className="deep-dive__all-data-panel">
      {sections.map((section) => (
        <section key={section.title} className="deep-dive__metric-section">
          <h3 className="deep-dive__metric-section-title">{section.title}</h3>
          <ul className="deep-dive__metric-list">
            {section.rows.map((row) => {
              const arrow = trendArrow(row.trend);
              return (
                <li key={row.key} className="deep-dive__metric-row">
                  <span className="deep-dive__metric-label">{row.label}</span>
                  <div className="deep-dive__metric-body">
                    <span className="deep-dive__metric-value">
                      {row.value}
                      {arrow && (
                        <span
                          className={`deep-dive__metric-trend ${trendClass(row.trend)}`}
                          aria-hidden="true"
                        >
                          {arrow}
                        </span>
                      )}
                    </span>
                    {row.context && (
                      <span className="deep-dive__metric-context">{row.context}</span>
                    )}
                    {row.sparkline}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
