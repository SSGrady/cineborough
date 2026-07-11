import type { DcMetroFeatureProperties, PropertyRecord, ZipMetrics } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";

interface ZipDetailPanelProps {
  zip: ZipMetrics;
  metroAvgPsf: number;
  onClose: () => void;
  /** When true, renders inside cinematic scroll panel (no outer chrome). */
  embedded?: boolean;
  /** Inline vibe/quote from unified GeoJSON feature properties */
  featureProps?: DcMetroFeatureProperties;
  /** Mock properties in this ZIP for Level 3 drill-down */
  properties?: PropertyRecord[];
  onEvaluateProperty?: (propertyId: string) => void;
}

export function ZipDetailPanel({
  zip,
  metroAvgPsf,
  onClose,
  embedded = false,
  featureProps,
  properties = [],
  onEvaluateProperty,
}: ZipDetailPanelProps) {
  const psfVsMarket =
    metroAvgPsf > 0 ? ((zip.marketPsf - metroAvgPsf) / metroAvgPsf) * 100 : 0;

  const forecastPct = featureProps?.oneYearForecastPct ?? zip.homePriceForecast1yr;
  const gaugeRotation = Math.max(-45, Math.min(45, forecastPct * 10));

  return (
    <section className={embedded ? "zip-detail zip-detail--embedded zip-detail--stacked" : "zip-detail zip-detail--stacked"}>
      <header className="zip-detail__header">
        <div>
          <h2>
            {zip.zip} — {zip.name}
          </h2>
          <p className="zip-detail__subtitle">
            {zip.state}
            {featureProps?.primaryVibe ? ` · ${featureProps.primaryVibe}` : ""}
            {" · "}Opportunity {zip.opportunityScoreNormalized?.toFixed(0) ?? "—"}
          </p>
        </div>
        <button type="button" className="zip-detail__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="zip-detail__stack">
        <article className="zip-detail__block zip-detail__block--investor">
          <h3>Investor Signals</h3>

          <div className="zip-detail__gauge-row">
            <div className="forecast-gauge" aria-label={`1-year forecast ${formatPercent(forecastPct)}`}>
              <div className="forecast-gauge__dial">
                <div
                  className="forecast-gauge__needle"
                  style={{ transform: `rotate(${gaugeRotation}deg)` }}
                />
              </div>
              <div className="forecast-gauge__value">{formatPercent(forecastPct)}</div>
              <div className="forecast-gauge__label">1-Year Forecast</div>
            </div>

            <dl className="metric-grid metric-grid--compact">
              <div>
                <dt>Median Home Value</dt>
                <dd>{formatCurrency(zip.medianHomeValue)}</dd>
              </div>
              <div>
                <dt>Cap Rate</dt>
                <dd>{formatPercent(zip.capRate)}</dd>
              </div>
              <div>
                <dt>Days on Market</dt>
                <dd>{zip.daysOnMarket}</dd>
              </div>
              <div>
                <dt>Seller Desperation</dt>
                <dd>{zip.sellerDesperationScore}/100</dd>
              </div>
              <div>
                <dt>Over / Undervaluation</dt>
                <dd>{formatPercent(zip.overvaluationPct)}</dd>
              </div>
              <div>
                <dt>Market PSF</dt>
                <dd>${zip.marketPsf}/sqft ({formatPercent(psfVsMarket)} vs metro)</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="zip-detail__block zip-detail__block--hope">
          <h3>Hope-Core Discovery</h3>
          <dl className="metric-grid">
            <div>
              <dt>Remote Work %</dt>
              <dd>{zip.remoteWorkPct.toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Walk Score</dt>
              <dd>{featureProps?.walkScore ?? zip.walkabilityScore}/100</dd>
            </div>
            <div>
              <dt>Homeowners 25–44 %</dt>
              <dd>{zip.homeowners25to44Pct.toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Median Age</dt>
              <dd>{zip.medianAge.toFixed(1)} yrs</dd>
            </div>
            <div>
              <dt>Population Growth</dt>
              <dd>{formatPercent(zip.populationGrowthRate)}</dd>
            </div>
            <div>
              <dt>College Degree Rate</dt>
              <dd>{zip.collegeDegreeRate.toFixed(1)}%</dd>
            </div>
          </dl>
        </article>

        {properties.length > 0 && onEvaluateProperty && (
          <article className="zip-detail__block zip-detail__block--valuation">
            <h3>Evaluate Property</h3>
            <p className="zip-detail__valuation-hint">
              Select a listing to see offer ranges, renovation adjustments, and comps.
            </p>
            <div className="property-chips" role="group" aria-label="Properties in ZIP">
              {properties.map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  className="property-chip"
                  onClick={() => onEvaluateProperty(prop.id)}
                >
                  <span className="property-chip__address">{prop.address}</span>
                  <span className="property-chip__price">{formatCurrency(prop.listPrice)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="zip-detail__evaluate-cta"
              onClick={() => onEvaluateProperty(properties[0].id)}
            >
              Evaluate property →
            </button>
          </article>
        )}
      </div>
    </section>
  );
}
