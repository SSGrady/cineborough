import type { MetricLayerKey } from "@cineborough/data";
import { METRIC_PROVENANCE, metricAttributionLabel } from "@cineborough/data";
import { legendStops } from "@cineborough/geo";

interface BottomBarProps {
  activeMetric: MetricLayerKey;
  dataAsOfLabel: string;
  metricLabel: string;
  valueMin?: string;
  valueMax?: string;
  tooltipsEnabled: boolean;
  onToggleTooltips: () => void;
  exploreMode?: boolean;
  onToggleExploreMode?: () => void;
}

export function BottomBar({
  activeMetric,
  dataAsOfLabel,
  metricLabel,
  valueMin,
  valueMax,
  tooltipsEnabled,
  onToggleTooltips,
  exploreMode = false,
  onToggleExploreMode,
}: BottomBarProps) {
  const legend = legendStops(activeMetric);
  const attribution = metricAttributionLabel(activeMetric, dataAsOfLabel);
  const source = METRIC_PROVENANCE[activeMetric];

  return (
    <footer className="bottom-bar">
      <label className="bottom-bar__toggle">
        <input
          type="checkbox"
          checked={tooltipsEnabled}
          onChange={onToggleTooltips}
        />
        <span>Tooltips</span>
      </label>

      {onToggleExploreMode && (
        <button
          type="button"
          className={`bottom-bar__explore-btn${exploreMode ? " bottom-bar__explore-btn--active" : ""}`}
          onClick={onToggleExploreMode}
          aria-pressed={exploreMode}
        >
          {exploreMode ? "Story mode" : "Explore map"}
        </button>
      )}

      <span
        className={`bottom-bar__date bottom-bar__date--${source.provenance}`}
        title={source.provenance === "mock" ? "This metric uses mock estimates until a live source is wired" : undefined}
      >
        {attribution}
        {source.provenance === "mock" && (
          <span className="bottom-bar__mock-tag" aria-label="mock data">
            mock
          </span>
        )}
      </span>

      <div className="bottom-bar__legend" aria-label={`${metricLabel} color legend`}>
        <span className="bottom-bar__legend-title">{metricLabel}</span>
        {legend.style === "gradient" ? (
          <div className="bottom-bar__legend-gradient-wrap">
            {valueMin && <span className="bottom-bar__legend-bound">{valueMin}</span>}
            <span
              className="bottom-bar__legend-gradient"
              style={{ background: legend.gradientCss }}
              aria-hidden="true"
            />
            {valueMax && <span className="bottom-bar__legend-bound">{valueMax}</span>}
          </div>
        ) : (
          <ul className="bottom-bar__legend-stops">
            {legend.stops.map((stop) => (
              <li key={stop.label}>
                <span
                  className="bottom-bar__legend-swatch"
                  style={{ background: stop.color }}
                />
                {stop.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
