import type { MetricLayerDefinition, MetricLayerKey } from "@cineborough/data";
import { METRIC_LAYERS } from "@cineborough/data";

interface SidebarProps {
  activeMetric: MetricLayerKey;
  onMetricChange: (key: MetricLayerKey) => void;
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

export function Sidebar({ activeMetric, onMetricChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <h2>Data Layers</h2>
        <p>Select a metric to color the map</p>
      </header>

      {CATEGORY_ORDER.map((category) => (
        <section key={category} className="sidebar__section">
          <h3>{CATEGORY_LABELS[category]}</h3>
          <ul className="sidebar__layers">
            {layersByCategory(category).map((layer) => (
              <li key={layer.key}>
                <button
                  type="button"
                  className={`sidebar__layer${activeMetric === layer.key ? " sidebar__layer--active" : ""}`}
                  onClick={() => onMetricChange(layer.key)}
                >
                  <span className="sidebar__layer-label">{layer.label}</span>
                  <span className="sidebar__layer-unit">{layer.unit}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
