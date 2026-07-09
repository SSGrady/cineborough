import { OPPORTUNITY_COLOR_STOPS } from "@cineborough/geo";

interface ColorLegendProps {
  title: string;
}

export function ColorLegend({ title }: ColorLegendProps) {
  return (
    <div className="color-legend">
      <span className="color-legend__title">{title}</span>
      <ul className="color-legend__stops">
        {OPPORTUNITY_COLOR_STOPS.map((stop) => (
          <li key={stop.label}>
            <span className="color-legend__swatch" style={{ background: stop.color }} />
            {stop.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
