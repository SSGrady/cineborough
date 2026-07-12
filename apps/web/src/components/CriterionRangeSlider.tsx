"use client";

import { useMemo, useState } from "react";
import {
  type DcMetroGeoJson,
  type DiscoveryFilter,
  type DiscoveryFilterMetric,
  getDiscoveryMetricDef,
  getDiscoveryMetricLabel,
  getDiscoveryMetricUnit,
  getShardMetricHistogram,
  type HistogramBin,
} from "@cineborough/data";

interface CriterionRangeSliderProps {
  filter: DiscoveryFilter;
  geoJson: DcMetroGeoJson | null;
  heatmapActive?: boolean;
  onChange: (patch: Partial<Pick<DiscoveryFilter, "min" | "max">>) => void;
}

function formatValue(metric: DiscoveryFilterMetric, value: number): string {
  if (metric === "medianHomeValue") {
    return value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : `$${Math.round(value / 1000)}k`;
  }
  const unit = getDiscoveryMetricUnit(metric);
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "days") return `${Math.round(value)}d`;
  if (unit === "$/sqft") return `$${Math.round(value)}`;
  if (unit === "0–100") return `${Math.round(value)}`;
  if (unit === "1–10") return value.toFixed(1);
  if (unit === "min") return `${Math.round(value)} min`;
  if (unit === "per 10k") return value.toFixed(1);
  return value.toFixed(1);
}

function formatBinRange(metric: DiscoveryFilterMetric, bin: HistogramBin): string {
  return `${formatValue(metric, bin.start)} – ${formatValue(metric, bin.end)}`;
}

function bandBounds(
  kind: ReturnType<typeof getDiscoveryMetricDef>["kind"],
  sliderMin: number,
  sliderMax: number,
  currentMin: number,
  currentMax: number,
): { lo: number; hi: number } {
  if (kind === "min") return { lo: currentMin, hi: sliderMax };
  if (kind === "max") return { lo: sliderMin, hi: currentMax };
  return { lo: Math.min(currentMin, currentMax), hi: Math.max(currentMin, currentMax) };
}

function binInBand(bin: HistogramBin, lo: number, hi: number): boolean {
  return bin.end > lo && bin.start < hi;
}

export function CriterionRangeSlider({
  filter,
  geoJson,
  heatmapActive = false,
  onChange,
}: CriterionRangeSliderProps) {
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const def = getDiscoveryMetricDef(filter.metric);
  const histogram = useMemo(() => {
    if (!geoJson) return null;
    return getShardMetricHistogram(geoJson, filter.metric, 20);
  }, [geoJson, filter.metric]);

  const maxCount = useMemo(
    () => Math.max(1, ...(histogram?.bins.map((b) => b.count) ?? [1])),
    [histogram],
  );

  const sliderMin = histogram?.min ?? def.defaultMin ?? 0;
  const sliderMax = histogram?.max ?? def.defaultMax ?? 100;
  const span = sliderMax - sliderMin || 1;

  const currentMin = filter.min ?? def.defaultMin ?? sliderMin;
  const currentMax = filter.max ?? def.defaultMax ?? sliderMax;
  const { lo: bandLo, hi: bandHi } = bandBounds(def.kind, sliderMin, sliderMax, currentMin, currentMax);

  const bandLeft = ((bandLo - sliderMin) / span) * 100;
  const bandWidth = ((bandHi - bandLo) / span) * 100;

  return (
    <div className={`criterion-range${heatmapActive ? " criterion-range--heatmap" : ""}`}>
      {histogram && histogram.bins.length > 0 && (
        <div className="criterion-range__histogram" aria-hidden="true">
          {histogram.bins.map((bin, i) => {
            const inBand = binInBand(bin, bandLo, bandHi);
            const isHovered = hoveredBin === i;
            return (
              <div
                key={i}
                className={`criterion-range__bar${inBand ? " criterion-range__bar--in-band" : ""}${isHovered ? " criterion-range__bar--hover" : ""}`}
                style={{ height: `${(bin.count / maxCount) * 100}%` }}
                onMouseEnter={() => setHoveredBin(i)}
                onMouseLeave={() => setHoveredBin((prev) => (prev === i ? null : prev))}
              >
                {isHovered && (
                  <span className="criterion-range__tooltip" role="tooltip">
                    <span className="criterion-range__tooltip-count">{bin.count}</span>
                    <span className="criterion-range__tooltip-range">
                      {formatBinRange(filter.metric, bin)}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
          <div
            className="criterion-range__band"
            style={{ left: `${bandLeft}%`, width: `${Math.max(bandWidth, 2)}%` }}
          />
        </div>
      )}

      {def.kind === "range" ? (
        <div className="criterion-range__dual">
          <input
            type="range"
            className="criterion-range__input criterion-range__input--min"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMin}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} minimum`}
            onChange={(e) => onChange({ min: Number(e.target.value) })}
          />
          <input
            type="range"
            className="criterion-range__input criterion-range__input--max"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMax}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} maximum`}
            onChange={(e) => onChange({ max: Number(e.target.value) })}
          />
          <div className="criterion-range__labels">
            <span>{formatValue(filter.metric, currentMin)}</span>
            <span>{formatValue(filter.metric, currentMax)}</span>
          </div>
        </div>
      ) : def.kind === "min" ? (
        <div className="criterion-range__single">
          <input
            type="range"
            className="criterion-range__input"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMin}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} minimum`}
            onChange={(e) => onChange({ min: Number(e.target.value) })}
          />
          <div className="criterion-range__labels">
            <span>Min: {formatValue(filter.metric, currentMin)}</span>
          </div>
        </div>
      ) : (
        <div className="criterion-range__single">
          <input
            type="range"
            className="criterion-range__input"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMax}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} maximum`}
            onChange={(e) => onChange({ max: Number(e.target.value) })}
          />
          <div className="criterion-range__labels">
            <span>Max: {formatValue(filter.metric, currentMax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
