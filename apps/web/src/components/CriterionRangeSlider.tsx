"use client";

import { useMemo, useState } from "react";
import {
  type DcMetroGeoJson,
  type DiscoveryFilter,
  type DiscoveryFilterMetric,
  getDiscoveryMetricDef,
  getDiscoveryMetricLabel,
  getDiscoveryMetricUnit,
  getMetricSliderBounds,
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
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);
  const def = getDiscoveryMetricDef(filter.metric);

  const rawHistogram = useMemo(() => {
    if (!geoJson) return null;
    return getShardMetricHistogram(geoJson, filter.metric, 20);
  }, [geoJson, filter.metric]);

  const { sliderMin, sliderMax, histogram } = useMemo(() => {
    const bounds = getMetricSliderBounds(filter.metric, rawHistogram);
    if (!geoJson) {
      return { sliderMin: bounds.min, sliderMax: bounds.max, histogram: null };
    }
    const hist = getShardMetricHistogram(
      geoJson,
      filter.metric,
      20,
      bounds.min,
      bounds.max,
    );
    return { sliderMin: bounds.min, sliderMax: bounds.max, histogram: hist };
  }, [geoJson, filter.metric, rawHistogram]);

  const maxCount = useMemo(
    () => Math.max(1, ...(histogram?.bins.map((b) => b.count) ?? [1])),
    [histogram],
  );

  const span = sliderMax - sliderMin || 1;

  const currentMin = filter.min ?? def.defaultMin ?? sliderMin;
  const currentMax = filter.max ?? def.defaultMax ?? sliderMax;
  const bandLo = Math.min(currentMin, currentMax);
  const bandHi = Math.max(currentMin, currentMax);

  const bandLeft = ((bandLo - sliderMin) / span) * 100;
  const bandWidth = ((bandHi - bandLo) / span) * 100;

  const minPercent = ((currentMin - sliderMin) / span) * 100;
  const maxPercent = ((currentMax - sliderMin) / span) * 100;

  const handleMinChange = (value: number) => {
    const nextMin = Math.max(sliderMin, Math.min(value, currentMax));
    onChange({ min: nextMin });
  };

  const handleMaxChange = (value: number) => {
    const nextMax = Math.min(sliderMax, Math.max(value, currentMin));
    onChange({ max: nextMax });
  };

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

      <div className="criterion-range__dual">
        <div
          className="criterion-range__track"
          style={{ left: `${minPercent}%`, width: `${Math.max(maxPercent - minPercent, 0)}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          className={`criterion-range__input criterion-range__input--min${activeThumb === "min" ? " criterion-range__input--active" : ""}`}
          min={sliderMin}
          max={sliderMax}
          step={def.step}
          value={currentMin}
          aria-label={`${getDiscoveryMetricLabel(filter.metric)} minimum`}
          onPointerDown={() => setActiveThumb("min")}
          onPointerUp={() => setActiveThumb(null)}
          onBlur={() => setActiveThumb(null)}
          onChange={(e) => handleMinChange(Number(e.target.value))}
        />
        <input
          type="range"
          className={`criterion-range__input criterion-range__input--max${activeThumb === "max" ? " criterion-range__input--active" : ""}`}
          min={sliderMin}
          max={sliderMax}
          step={def.step}
          value={currentMax}
          aria-label={`${getDiscoveryMetricLabel(filter.metric)} maximum`}
          onPointerDown={() => setActiveThumb("max")}
          onPointerUp={() => setActiveThumb(null)}
          onBlur={() => setActiveThumb(null)}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
        />
        <div className="criterion-range__labels">
          <span>{formatValue(filter.metric, currentMin)}</span>
          <span>{formatValue(filter.metric, currentMax)}</span>
        </div>
      </div>
    </div>
  );
}
