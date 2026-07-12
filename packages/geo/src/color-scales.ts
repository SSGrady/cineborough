/** DC metro sandbox bounds — see ADR-004 */
export const DC_METRO_BOUNDS: [[number, number], [number, number]] = [
  [-77.2, 38.75],
  [-76.85, 39.05],
];

export const DC_METRO_CENTER: [number, number] = [-77.0369, 38.9072];

export const DEFAULT_ZOOM = 10;

/** Clarendon / 22201 focal point for cinematic descent */
export const ARLINGTON_CLARENDON_CENTER: [number, number] = [-77.096, 38.886];

export interface MapCameraTarget {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
}

/** Scroll-section camera presets — see ADR-008 */
export const CINEMATIC_CAMERAS = {
  metro: {
    center: DC_METRO_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
    duration: 1800,
  },
  neighborhood: {
    center: ARLINGTON_CLARENDON_CENTER,
    zoom: 12.5,
    pitch: 45,
    bearing: -20,
    duration: 2000,
  },
  detail: {
    center: ARLINGTON_CLARENDON_CENTER,
    zoom: 13.5,
    pitch: 60,
    bearing: -15,
    duration: 2000,
  },
} as const satisfies Record<string, MapCameraTarget>;

export interface ColorStop {
  min: number;
  max: number;
  color: string;
  label: string;
}

/** Choropleth color scale — see docs/schema/opportunity-index.md */
export const OPPORTUNITY_COLOR_STOPS: ColorStop[] = [
  { min: 70, max: 100, color: "#22c55e", label: "High opportunity" },
  { min: 40, max: 69, color: "#eab308", label: "Moderate opportunity" },
  { min: 0, max: 39, color: "#ef4444", label: "Low opportunity" },
];

export function colorForNormalizedScore(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  for (const stop of OPPORTUNITY_COLOR_STOPS) {
    if (clamped >= stop.min && clamped <= stop.max) {
      return stop.color;
    }
  }
  return OPPORTUNITY_COLOR_STOPS[OPPORTUNITY_COLOR_STOPS.length - 1].color;
}

/** Reventure-style blue (low) → red (high) for home value and similar metrics */
export const VALUE_COLOR_STOPS: ColorStop[] = [
  { min: 0, max: 20, color: "#2166ac", label: "Low" },
  { min: 21, max: 40, color: "#67a9cf", label: "Below avg" },
  { min: 41, max: 60, color: "#f7f7f7", label: "Average" },
  { min: 61, max: 80, color: "#ef8a62", label: "Above avg" },
  { min: 81, max: 100, color: "#b2182b", label: "High" },
];

export function colorForValueGradient(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  for (const stop of VALUE_COLOR_STOPS) {
    if (clamped >= stop.min && clamped <= stop.max) {
      return stop.color;
    }
  }
  return VALUE_COLOR_STOPS[VALUE_COLOR_STOPS.length - 1].color;
}

export type ChoroplethPalette = "opportunity" | "value";

export function choroplethPaletteForMetric(metricKey: string): ChoroplethPalette {
  if (metricKey === "marketPsf") {
    return "value";
  }
  return "opportunity";
}

export function usesTercileLegend(metricKey: string): boolean {
  return metricKey !== "marketPsf";
}

export function colorForChoropleth(palette: ChoroplethPalette, normalizedScore: number): string {
  return palette === "value"
    ? colorForValueGradient(normalizedScore)
    : colorForNormalizedScore(normalizedScore);
}

export type LegendStyle = "tercile" | "gradient";

export interface LegendStop {
  color: string;
  label: string;
}

export interface MetricLegendSpec {
  style: LegendStyle;
  stops: LegendStop[];
  /** CSS linear-gradient for gradient style legends */
  gradientCss: string;
}

const VALUE_GRADIENT_CSS = "linear-gradient(to right, #2166ac, #67a9cf, #f7f7f7, #ef8a62, #b2182b)";

export interface TercileLegendBounds {
  low: string;
  mid: string;
  high: string;
}

/** Metric-aware legend configuration for map bottom bar */
export function legendStops(
  metricKey: string,
  tercileBounds?: TercileLegendBounds,
): MetricLegendSpec {
  if (metricKey === "opportunityScore") {
    return {
      style: "tercile",
      gradientCss: "",
      stops: OPPORTUNITY_COLOR_STOPS.map(({ color, label }) => ({ color, label })),
    };
  }

  if (metricKey === "marketPsf") {
    return {
      style: "gradient",
      gradientCss: VALUE_GRADIENT_CSS,
      stops: [
        { color: "#2166ac", label: "Low" },
        { color: "#b2182b", label: "High" },
      ],
    };
  }

  if (metricKey === "medianHomeValue") {
    return {
      style: "tercile",
      gradientCss: "",
      stops: [
        { color: "#22c55e", label: "< $300,000 — More affordable" },
        { color: "#eab308", label: "$300,000 – $750,000 — Middle range" },
        { color: "#ef4444", label: "> $750,000 — Higher cost" },
      ],
    };
  }

  if (metricKey === "medianAge") {
    return {
      style: "tercile",
      gradientCss: "",
      stops: [
        { color: "#22c55e", label: "< 37.0 — Younger" },
        { color: "#eab308", label: "37.0 – 38.6 — Mid-range" },
        { color: "#ef4444", label: "> 38.6 — Older" },
      ],
    };
  }

  if (metricKey === "walkabilityScore") {
    return {
      style: "tercile",
      gradientCss: "",
      stops: [
        { color: "#ef4444", label: "< 50.0 — Car-dependent" },
        { color: "#eab308", label: "50.0 – 60.9 — Moderate" },
        { color: "#22c55e", label: "≥ 61 — Highly walkable" },
      ],
    };
  }

  if (metricKey === "homePriceForecast1yr") {
    return {
      style: "tercile",
      gradientCss: "",
      stops: [
        { color: "#ef4444", label: "< 0%" },
        { color: "#eab308", label: "0% – 2.9%" },
        { color: "#22c55e", label: "≥ 3%" },
      ],
    };
  }

  return {
    style: "tercile",
    gradientCss: "",
    stops: [
      {
        color: "#ef4444",
        label: tercileBounds?.low ?? "Low (bottom third)",
      },
      {
        color: "#eab308",
        label: tercileBounds?.mid ?? "Moderate (middle third)",
      },
      {
        color: "#22c55e",
        label: tercileBounds?.high ?? "High (top third)",
      },
    ],
  };
}

export function interpolateColor(score: number, min: number, max: number): string {
  if (max === min) return OPPORTUNITY_COLOR_STOPS[1].color;
  const normalized = ((score - min) / (max - min)) * 100;
  return colorForNormalizedScore(normalized);
}
