"use client";

import type { RankedNeighborhood } from "@cineborough/data";
import { DiscoveryAnalyticsPanel } from "./DiscoveryAnalyticsPanel";

interface AnalyticsOverlayProps {
  neighborhood: RankedNeighborhood;
  metroAvgPsf: number;
  phaseLabel: string;
  animateIn?: boolean;
  onOpenDetails?: () => void;
}

export function AnalyticsOverlay({
  neighborhood,
  metroAvgPsf,
  phaseLabel,
  animateIn = false,
  onOpenDetails,
}: AnalyticsOverlayProps) {
  return (
    <aside
      className={`analytics-overlay${animateIn ? " analytics-overlay--enter" : ""}`}
      aria-label={`Analytics for ${neighborhood.zip}`}
    >
      <div className="analytics-overlay__chrome">
        <span className="analytics-overlay__phase">{phaseLabel}</span>
        {onOpenDetails && (
          <button type="button" className="analytics-overlay__details-btn" onClick={onOpenDetails}>
            Full breakdown
          </button>
        )}
      </div>
      <DiscoveryAnalyticsPanel
        neighborhood={neighborhood}
        metroAvgPsf={metroAvgPsf}
        variant="overlay"
      />
    </aside>
  );
}
