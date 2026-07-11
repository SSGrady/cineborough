interface HomeValueSparklineProps {
  values: number[];
  label?: string;
}

export function HomeValueSparkline({ values, label = "Home Value Trend" }: HomeValueSparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 120;
  const height = 36;
  const padding = 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const latest = values[values.length - 1];
  const earliest = values[0];
  const changePct = earliest > 0 ? ((latest - earliest) / earliest) * 100 : 0;

  return (
    <div className="home-sparkline" aria-label={`${label}: ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% over period`}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="home-sparkline__label">{label}</div>
      <div className="home-sparkline__change">
        {changePct >= 0 ? "+" : ""}
        {changePct.toFixed(1)}%
      </div>
    </div>
  );
}

/** Derive 12-month mock sparkline from median value and YoY growth. */
export function generateHomeValueSparkline(medianHomeValue: number, growthYoy: number): number[] {
  const months = 12;
  const monthlyRate = growthYoy / 100 / 12;
  return Array.from({ length: months }, (_, i) =>
    Math.round(medianHomeValue / (1 + monthlyRate * (months - 1 - i))),
  );
}
