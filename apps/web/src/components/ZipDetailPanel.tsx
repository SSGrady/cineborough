import type { ZipMetrics } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";

interface ZipDetailPanelProps {
  zip: ZipMetrics;
  metroAvgPsf: number;
  onClose: () => void;
  /** When true, renders inside cinematic scroll panel (no outer chrome). */
  embedded?: boolean;
}

export function ZipDetailPanel({ zip, metroAvgPsf, onClose, embedded = false }: ZipDetailPanelProps) {
  const psfVsMarket =
    metroAvgPsf > 0 ? ((zip.marketPsf - metroAvgPsf) / metroAvgPsf) * 100 : 0;

  return (
    <section className={embedded ? "zip-detail zip-detail--embedded" : "zip-detail"}>
      <header className="zip-detail__header">
        <div>
          <h2>
            {zip.zip} — {zip.name}
          </h2>
          <p className="zip-detail__subtitle">
            Level 2 · {zip.state} · Opportunity {zip.opportunityScoreNormalized?.toFixed(0) ?? "—"}
          </p>
        </div>
        <button type="button" className="zip-detail__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="zip-detail__cards">
        <article className="zip-detail__card">
          <h3>Forecast &amp; Valuation</h3>
          <dl className="metric-grid">
            <div>
              <dt>1-Year Forecast</dt>
              <dd>{formatPercent(zip.homePriceForecast1yr)}</dd>
            </div>
            <div>
              <dt>Home Value Growth YoY</dt>
              <dd>{formatPercent(zip.homeValueGrowthYoy)}</dd>
            </div>
            <div>
              <dt>Over / Undervaluation</dt>
              <dd>{formatPercent(zip.overvaluationPct)}</dd>
            </div>
            <div>
              <dt>Market PSF</dt>
              <dd>${zip.marketPsf}/sqft</dd>
            </div>
            <div>
              <dt>% vs Market PSF</dt>
              <dd>{formatPercent(psfVsMarket)}</dd>
            </div>
            <div>
              <dt>Market Score</dt>
              <dd>{zip.sellerDesperationScore}/100</dd>
            </div>
          </dl>
        </article>

        <article className="zip-detail__card">
          <h3>Demographics &amp; Hope-Core</h3>
          <dl className="metric-grid">
            <div>
              <dt>Remote Work %</dt>
              <dd>{zip.remoteWorkPct.toFixed(1)}%</dd>
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
              <dt>Walkability Score</dt>
              <dd>{zip.walkabilityScore}/100</dd>
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
      </div>
    </section>
  );
}
