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

export function interpolateColor(score: number, min: number, max: number): string {
  if (max === min) return OPPORTUNITY_COLOR_STOPS[1].color;
  const normalized = ((score - min) / (max - min)) * 100;
  return colorForNormalizedScore(normalized);
}
