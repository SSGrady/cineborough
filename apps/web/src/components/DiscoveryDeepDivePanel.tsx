"use client";

import { useMemo, useState } from "react";
import type { DcMetroFeatureProperties, DcMetroGeoJson, DiscoveryCriteria } from "@cineborough/data";
import {
  criterionMatchStatus,
  criterionMatchStatusLabel,
  getDiscoveryMetricLabel,
  getNeighborhoodPhoto,
  getRawMetricFromFeature,
  type RankedNeighborhood,
} from "@cineborough/data";
import { ZipDetailPanel } from "./ZipDetailPanel";
import { LocaleQuoteCard } from "./LocaleQuoteCard";

type DeepDiveTab = "criteria" | "all-data";

interface DiscoveryDeepDivePanelProps {
  neighborhood: RankedNeighborhood;
  criteria: DiscoveryCriteria;
  geoJson: DcMetroGeoJson;
  metroAvgPsf: number;
  featureProps?: DcMetroFeatureProperties;
  mapCenter?: [number, number] | null;
  onBack: () => void;
}

function matchTierClass(pct: number): string {
  if (pct >= 90) return "deep-dive__match--strong";
  if (pct >= 70) return "deep-dive__match--close";
  return "deep-dive__match--partial";
}

function formatCriterionValue(metric: string, value: number): string {
  if (metric === "medianHomeValue") {
    return value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : `$${Math.round(value / 1000)}k`;
  }
  return `${Math.round(value * 10) / 10}`;
}

export function DiscoveryDeepDivePanel({
  neighborhood,
  criteria,
  geoJson,
  metroAvgPsf,
  featureProps,
  mapCenter,
  onBack,
}: DiscoveryDeepDivePanelProps) {
  const [tab, setTab] = useState<DeepDiveTab>("criteria");
  const photo = getNeighborhoodPhoto(neighborhood.zip);
  const roundedMatch = Math.round(neighborhood.matchPercent);

  const criterionRows = useMemo(() => {
    return criteria.filters.map((filter) => {
      const score = neighborhood.breakdown.byMetric[filter.metric] ?? 0;
      const status = criterionMatchStatus(score);
      const feature = geoJson.features.find(
        (f) => f.properties.zipCode === neighborhood.zip,
      );
      const rawValue = feature
        ? getRawMetricFromFeature(feature.properties, filter.metric)
        : 0;
      return {
        filter,
        score,
        status,
        statusLabel: criterionMatchStatusLabel(status),
        label: getDiscoveryMetricLabel(filter.metric),
        rawValue,
      };
    });
  }, [criteria.filters, neighborhood, geoJson]);

  const googleMapsUrl = useMemo(() => {
    const query = encodeURIComponent(
      `${neighborhood.zip} ${neighborhood.name}, ${neighborhood.state}`,
    );
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [neighborhood]);

  return (
    <aside className="deep-dive" aria-label="Neighborhood detail">
      <header className="deep-dive__header">
        <button
          type="button"
          className="deep-dive__back"
          onClick={onBack}
          aria-label="Back to matches"
        >
          ‹ Matches
        </button>
      </header>

      <div className="deep-dive__scroll">
        <figure className="deep-dive__hero" aria-label={`Photo for ${neighborhood.zip}`}>
          {photo ? (
            <img
              src={photo.url}
              alt={photo.alt}
              className="deep-dive__hero-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="deep-dive__hero-placeholder" aria-hidden="true" />
          )}
          <figcaption className="deep-dive__hero-caption">
            <span className="deep-dive__hero-zip">{neighborhood.zip}</span>
            <span className="deep-dive__hero-name">{neighborhood.name}</span>
            {photo?.credit && (
              <span className="deep-dive__hero-credit">{photo.credit}</span>
            )}
          </figcaption>
        </figure>

        <div className="deep-dive__match-row">
          <div>
            <h2 className="deep-dive__title">
              {neighborhood.zip} — {neighborhood.name}
            </h2>
            <p className="deep-dive__subtitle">
              #{neighborhood.rank} · {neighborhood.state}
              {featureProps?.primaryVibe ? ` · ${featureProps.primaryVibe}` : ""}
            </p>
          </div>
          <div
            className={`deep-dive__match ${matchTierClass(roundedMatch)}`}
            aria-label={`${roundedMatch}% match`}
          >
            <span className="deep-dive__match-value">{roundedMatch}%</span>
            <span className="deep-dive__match-label">Match</span>
          </div>
        </div>

        <nav className="deep-dive__tabs" role="tablist" aria-label="Detail sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "criteria"}
            className={`deep-dive__tab${tab === "criteria" ? " deep-dive__tab--active" : ""}`}
            onClick={() => setTab("criteria")}
          >
            My criteria
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "all-data"}
            className={`deep-dive__tab${tab === "all-data" ? " deep-dive__tab--active" : ""}`}
            onClick={() => setTab("all-data")}
          >
            All data
          </button>
        </nav>

        {tab === "criteria" ? (
          <section className="deep-dive__criteria" role="tabpanel" aria-label="My criteria">
            {criterionRows.length === 0 ? (
              <p className="deep-dive__empty">No criteria set — add metrics in the left panel.</p>
            ) : (
              <ul className="deep-dive__criterion-list">
                {criterionRows.map((row) => (
                  <li key={row.filter.id} className="deep-dive__criterion-row">
                    <div className="deep-dive__criterion-head">
                      <span className="deep-dive__criterion-label">{row.label}</span>
                      <span
                        className={`deep-dive__criterion-status deep-dive__criterion-status--${row.status}`}
                      >
                        {row.statusLabel}
                      </span>
                    </div>
                    <div className="deep-dive__criterion-meta">
                      <span className="deep-dive__criterion-value">
                        {formatCriterionValue(row.filter.metric, row.rawValue)}
                      </span>
                      <span className="deep-dive__criterion-score">{Math.round(row.score)}%</span>
                    </div>
                    <div
                      className="deep-dive__criterion-bar"
                      role="progressbar"
                      aria-valuenow={row.score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${row.label} match ${Math.round(row.score)}%`}
                    >
                      <div
                        className={`deep-dive__criterion-fill deep-dive__criterion-fill--${row.status}`}
                        style={{ width: `${Math.min(100, row.score)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="deep-dive__all-data" role="tabpanel" aria-label="All data">
            <ZipDetailPanel
              zip={neighborhood.metrics}
              metroAvgPsf={metroAvgPsf}
              onClose={onBack}
              embedded
              featureProps={featureProps}
            />
          </section>
        )}

        <LocaleQuoteCard
          zip={neighborhood.zip}
          quoteText={featureProps?.localQuote}
          primaryVibe={featureProps?.primaryVibe}
          neighborhood={neighborhood.name}
          mapCenter={mapCenter}
        />

        <footer className="deep-dive__links">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="deep-dive__link"
          >
            Google Maps
          </a>
          <span className="deep-dive__link deep-dive__link--placeholder" title="Walk Score API — coming soon">
            Walk Score (soon)
          </span>
        </footer>
      </div>
    </aside>
  );
}
