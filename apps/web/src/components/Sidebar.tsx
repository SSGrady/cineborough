import type { MetricLayerDefinition, MetricLayerKey } from "@cineborough/data";
import { METRIC_LAYERS } from "@cineborough/data";
import type { ZipMetrics } from "@cineborough/data";
import { formatCurrency, formatPercent } from "@/lib/format";

export type GeographyLevel = "national" | "state" | "metro" | "county" | "zip";

interface SidebarProps {
  activeMetric: MetricLayerKey;
  onMetricChange: (key: MetricLayerKey) => void;
  mode?: "full" | "slim";
  geography?: GeographyLevel;
  onGeographyChange?: (level: GeographyLevel) => void;
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

const GEOGRAPHY_OPTIONS: { key: GeographyLevel; label: string; enabled: boolean }[] = [
  { key: "national", label: "National", enabled: true },
  { key: "state", label: "State", enabled: true },
  { key: "metro", label: "Metro", enabled: true },
  { key: "county", label: "County", enabled: true },
  { key: "zip", label: "Zip", enabled: true },
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
  geography = "metro",
  onGeographyChange,
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

      <section className="sidebar__section sidebar__geography">
        <h3>Geography</h3>
        <div className="sidebar__geo-toggles" role="group" aria-label="Geography level">
          {GEOGRAPHY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`sidebar__geo-btn${
                geography === opt.key ? " sidebar__geo-btn--active" : ""
              }${!opt.enabled ? " sidebar__geo-btn--disabled" : ""}`}
              disabled={!opt.enabled}
              onClick={() => opt.enabled && onGeographyChange?.(opt.key)}
              aria-pressed={geography === opt.key}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="sidebar__geo-hint">
          Pan the map in open areas or use Explore map. Data: DC sandbox ZIPs only until national ingest ships.
        </p>
      </section>

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
