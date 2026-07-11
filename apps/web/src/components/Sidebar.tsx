"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  MetricLayerCategory,
  MetricLayerDefinition,
  MetricLayerKey,
} from "@cineborough/data";
import { METRIC_LAYERS } from "@cineborough/data";
import type { ZipMetrics } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";

interface SidebarProps {
  activeMetric: MetricLayerKey;
  onMetricChange: (key: MetricLayerKey) => void;
  mode?: "full" | "slim";
  selectedZip?: string | null;
  zips?: ZipMetrics[];
}

const CATEGORY_LABELS: Record<MetricLayerCategory, string> = {
  popular: "Popular Data",
  investor: "Investor Metrics",
  "market-trends": "Market Trends",
  demographics: "Demographics",
  "hope-core": "Hope-Core Discovery",
};

const CATEGORY_ORDER: MetricLayerCategory[] = [
  "popular",
  "investor",
  "market-trends",
  "demographics",
  "hope-core",
];

function layersByCategory(
  category: MetricLayerCategory,
  layers: MetricLayerDefinition[] = METRIC_LAYERS,
) {
  return layers.filter((layer) => layer.category === category);
}

function formatMetricValue(key: MetricLayerKey, value: number): string {
  const layer = METRIC_LAYERS.find((m) => m.key === key);
  if (!layer) return String(value);
  if (layer.unit === "$") return formatCurrency(value);
  if (layer.unit === "%") return formatPercent(value);
  if (layer.unit === "days") return `${Math.round(value)} days`;
  if (layer.unit === "$/sqft") return `$${Math.round(value)}/sqft`;
  if (layer.unit === "years") return `${value.toFixed(1)} yrs`;
  if (layer.unit === "0–100") return `${Math.round(value)}`;
  return value.toFixed(1);
}

function MetricRadioList({
  layers,
  activeMetric,
  onMetricChange,
  name,
  showUnits = true,
}: {
  layers: MetricLayerDefinition[];
  activeMetric: MetricLayerKey;
  onMetricChange: (key: MetricLayerKey) => void;
  name: string;
  showUnits?: boolean;
}) {
  if (layers.length === 0) return null;

  return (
    <ul className="sidebar__radio-list">
      {layers.map((layer) => (
        <li key={layer.key}>
          <label className="sidebar__radio">
            <input
              type="radio"
              name={name}
              checked={activeMetric === layer.key}
              onChange={() => onMetricChange(layer.key)}
            />
            <span className="sidebar__radio-label">{layer.label}</span>
            {showUnits && <span className="sidebar__radio-unit">{layer.unit}</span>}
          </label>
        </li>
      ))}
    </ul>
  );
}

function CollapsibleSection({
  category,
  layers,
  expanded,
  onToggle,
  activeMetric,
  onMetricChange,
}: {
  category: MetricLayerCategory;
  layers: MetricLayerDefinition[];
  expanded: boolean;
  onToggle: () => void;
  activeMetric: MetricLayerKey;
  onMetricChange: (key: MetricLayerKey) => void;
}) {
  if (layers.length === 0) return null;

  const sectionId = `sidebar-section-${category}`;

  return (
    <section className="sidebar__section">
      <button
        type="button"
        className="sidebar__section-toggle"
        aria-expanded={expanded}
        aria-controls={sectionId}
        onClick={onToggle}
      >
        <span>{CATEGORY_LABELS[category]}</span>
        <span className="sidebar__section-count">{layers.length}</span>
        <span className="sidebar__section-chevron" aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div id={sectionId}>
          <MetricRadioList
            layers={layers}
            activeMetric={activeMetric}
            onMetricChange={onMetricChange}
            name={`metric-${category}`}
          />
        </div>
      )}
    </section>
  );
}

export function Sidebar({
  activeMetric,
  onMetricChange,
  mode = "full",
  selectedZip = null,
  zips = [],
}: SidebarProps) {
  const activeLayer = METRIC_LAYERS.find((m) => m.key === activeMetric);
  const selected = zips.find((z) => z.zip === selectedZip);
  const [layerFilter, setLayerFilter] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<MetricLayerCategory>>(
    () => new Set(["popular"]),
  );

  const normalizedFilter = layerFilter.trim().toLowerCase();
  const filteredLayers = useMemo(
    () =>
      normalizedFilter
        ? METRIC_LAYERS.filter((layer) => layer.label.toLowerCase().includes(normalizedFilter))
        : METRIC_LAYERS,
    [normalizedFilter],
  );

  useEffect(() => {
    if (!activeLayer) return;
    setExpandedSections((prev) => {
      if (prev.has(activeLayer.category)) return prev;
      const next = new Set(prev);
      next.add(activeLayer.category);
      return next;
    });
  }, [activeLayer]);

  useEffect(() => {
    if (!normalizedFilter) return;
    setExpandedSections(new Set(CATEGORY_ORDER));
  }, [normalizedFilter]);

  const toggleSection = (category: MetricLayerCategory) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (mode === "slim") {
    return (
      <aside className="sidebar sidebar--slim">
        <header className="sidebar__header">
          <h2>{selected ? `${selected.zip} — ${selected.name}` : "ZIP Detail"}</h2>
          {selected && activeLayer && (
            <p className="sidebar__slim-metric">
              {activeLayer.label}:{" "}
              {formatMetricValue(activeMetric, getZipMetric(selected, activeMetric))}
            </p>
          )}
        </header>

        <div className="sidebar__search">
          <label className="sidebar__search-label" htmlFor="sidebar-layer-search">
            Search layers
          </label>
          <input
            id="sidebar-layer-search"
            className="sidebar__search-input"
            type="search"
            placeholder="Filter metrics…"
            value={layerFilter}
            onChange={(e) => setLayerFilter(e.target.value)}
          />
        </div>

        {CATEGORY_ORDER.map((category) => {
          const layers = layersByCategory(category, filteredLayers);
          return (
            <CollapsibleSection
              key={category}
              category={category}
              layers={layers}
              expanded={expandedSections.has(category)}
              onToggle={() => toggleSection(category)}
              activeMetric={activeMetric}
              onMetricChange={onMetricChange}
            />
          );
        })}

        {filteredLayers.length === 0 && (
          <p className="sidebar__empty">No layers match your search.</p>
        )}
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <h2>Data Layers</h2>
        <p>Select a metric to color the map</p>
      </header>

      {CATEGORY_ORDER.map((category) => (
        <CollapsibleSection
          key={category}
          category={category}
          layers={layersByCategory(category)}
          expanded={expandedSections.has(category)}
          onToggle={() => toggleSection(category)}
          activeMetric={activeMetric}
          onMetricChange={onMetricChange}
        />
      ))}
    </aside>
  );
}

function getZipMetric(zip: ZipMetrics, key: MetricLayerKey): number {
  if (key === "opportunityScore") {
    return zip.opportunityScoreNormalized ?? zip.opportunityScore;
  }
  return zip[key];
}
