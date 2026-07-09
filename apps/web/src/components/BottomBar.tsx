import { OPPORTUNITY_COLOR_STOPS } from "@cineborough/geo";

interface BottomBarProps {
  dataAsOfLabel: string;
  metricLabel: string;
  tooltipsEnabled: boolean;
  onToggleTooltips: () => void;
}

export function BottomBar({
  dataAsOfLabel,
  metricLabel,
  tooltipsEnabled,
  onToggleTooltips,
}: BottomBarProps) {
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

      <span className="bottom-bar__date">Data: {dataAsOfLabel}</span>

      <div className="bottom-bar__legend" aria-label={`${metricLabel} color legend`}>
        <span className="bottom-bar__legend-title">{metricLabel}</span>
        <ul className="bottom-bar__legend-stops">
          {OPPORTUNITY_COLOR_STOPS.map((stop) => (
            <li key={stop.label}>
              <span
                className="bottom-bar__legend-swatch"
                style={{ background: stop.color }}
              />
              {stop.label}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
