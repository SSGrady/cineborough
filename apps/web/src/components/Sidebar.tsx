import type { MetricLayerDefinition, MetricLayerKey } from "@cineborough/data";
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

const CATEGORY_LABELS: Record<MetricLayerDefinition["category"], string> = {
  popular: "Popular Data",
  investor: "Investor Metrics",
  "hope-core": "Hope-Core Discovery",
};

const CATEGORY_ORDER: MetricLayerDefinition["category"][] = [
  "popular",
  "investor",
  "hope-core",
];

function layersByCategory(category: MetricLayerDefinition["category"]) {
  return METRIC_LAYERS.filter((layer) => layer.category === category);
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

export function Sidebar({
  activeMetric,
  onMetricChange,
  mode = "full",
  selectedZip = null,
  zips = [],
}: SidebarProps) {
  const activeLayer = METRIC_LAYERS.find((m) => m.key === activeMetric);
  const selected = zips.find((z) => z.zip === selectedZip);

  if (mode === "slim") {
    return (
      <aside className="sidebar sidebar--slim">
        <header className="sidebar__header">
          <h2>{selected ? `${selected.zip} — ${selected.name}` : "ZIP Detail"}</h2>
          {selected && activeLayer && (
            <p className="sidebar__slim-metric">
              {activeLayer.label}: {formatMetricValue(activeMetric, getZipMetric(selected, activeMetric))}
            </p>
          )}
        </header>
        <section className="sidebar__section">
          <h3>Active Layer</h3>
          <ul className="sidebar__radio-list">
            {METRIC_LAYERS.filter((l) => l.category === "popular").map((layer) => (
              <li key={layer.key}>
                <label className="sidebar__radio">
                  <input
                    type="radio"
                    name="metric-slim"
                    checked={activeMetric === layer.key}
                    onChange={() => onMetricChange(layer.key)}
                  />
                  <span>{layer.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
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
        <section key={category} className="sidebar__section">
          <h3>{CATEGORY_LABELS[category]}</h3>
          <ul className="sidebar__radio-list">
            {layersByCategory(category).map((layer) => (
              <li key={layer.key}>
                <label className="sidebar__radio">
                  <input
                    type="radio"
                    name="metric"
                    checked={activeMetric === layer.key}
                    onChange={() => onMetricChange(layer.key)}
                  />
                  <span className="sidebar__radio-label">{layer.label}</span>
                  <span className="sidebar__radio-unit">{layer.unit}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
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
