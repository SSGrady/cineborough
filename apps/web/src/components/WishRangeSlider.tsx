"use client";

import { useMemo } from "react";
import {
  type DcMetroGeoJson,
  type DiscoveryFilter,
  type DiscoveryFilterMetric,
  getDiscoveryMetricDef,
  getDiscoveryMetricLabel,
  getDiscoveryMetricUnit,
  getShardMetricHistogram,
} from "@cineborough/data";

interface WishRangeSliderProps {
  filter: DiscoveryFilter;
  geoJson: DcMetroGeoJson | null;
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
  return value.toFixed(1);
}

export function WishRangeSlider({ filter, geoJson, onChange }: WishRangeSliderProps) {
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

  const bandLeft = ((Math.min(currentMin, currentMax) - sliderMin) / span) * 100;
  const bandWidth = ((Math.abs(currentMax - currentMin)) / span) * 100;

  return (
    <div className="wish-range">
      {histogram && histogram.bins.length > 0 && (
        <div className="wish-range__histogram" aria-hidden="true">
          {histogram.bins.map((bin, i) => (
            <div
              key={i}
              className="wish-range__bar"
              style={{ height: `${(bin.count / maxCount) * 100}%` }}
            />
          ))}
          <div
            className="wish-range__band"
            style={{ left: `${bandLeft}%`, width: `${Math.max(bandWidth, 2)}%` }}
          />
        </div>
      )}

      {def.kind === "range" ? (
        <div className="wish-range__dual">
          <input
            type="range"
            className="wish-range__input wish-range__input--min"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMin}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} minimum`}
            onChange={(e) => onChange({ min: Number(e.target.value) })}
          />
          <input
            type="range"
            className="wish-range__input wish-range__input--max"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMax}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} maximum`}
            onChange={(e) => onChange({ max: Number(e.target.value) })}
          />
          <div className="wish-range__labels">
            <span>{formatValue(filter.metric, currentMin)}</span>
            <span>{formatValue(filter.metric, currentMax)}</span>
          </div>
        </div>
      ) : def.kind === "min" ? (
        <div className="wish-range__single">
          <input
            type="range"
            className="wish-range__input"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMin}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} minimum`}
            onChange={(e) => onChange({ min: Number(e.target.value) })}
          />
          <div className="wish-range__labels">
            <span>Min: {formatValue(filter.metric, currentMin)}</span>
          </div>
        </div>
      ) : (
        <div className="wish-range__single">
          <input
            type="range"
            className="wish-range__input"
            min={sliderMin}
            max={sliderMax}
            step={def.step}
            value={currentMax}
            aria-label={`${getDiscoveryMetricLabel(filter.metric)} maximum`}
            onChange={(e) => onChange({ max: Number(e.target.value) })}
          />
          <div className="wish-range__labels">
            <span>Max: {formatValue(filter.metric, currentMax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
