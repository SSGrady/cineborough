import { legendStops } from "@cineborough/geo";

interface ColorLegendProps {
  title: string;
  metricKey?: string;
}

export function ColorLegend({ title, metricKey = "opportunityScore" }: ColorLegendProps) {
  const legend = legendStops(metricKey);

  return (
    <div className="color-legend">
      <span className="color-legend__title">{title}</span>
      {legend.style === "gradient" ? (
        <span
          className="color-legend__gradient"
          style={{ background: legend.gradientCss }}
          aria-hidden="true"
        />
      ) : (
        <ul className="color-legend__stops">
          {legend.stops.map((stop) => (
            <li key={stop.label}>
              <span className="color-legend__swatch" style={{ background: stop.color }} />
              {stop.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
