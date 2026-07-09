"use client";

import { useMemo, useState } from "react";
import type { MetricLayerKey, ZipMetrics } from "@cineborough/data";
import { MapView } from "./MapView";
import { Sidebar } from "./Sidebar";
import { ZipDetailPanel } from "./ZipDetailPanel";

interface DiscoveryClientProps {
  zips: ZipMetrics[];
}

export function DiscoveryClient({ zips }: DiscoveryClientProps) {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricLayerKey>("opportunityScore");

  const selected = useMemo(
    () => zips.find((z) => z.zip === selectedZip),
    [zips, selectedZip],
  );

  const metroAvgPsf = useMemo(() => {
    if (zips.length === 0) return 0;
    return zips.reduce((sum, z) => sum + z.marketPsf, 0) / zips.length;
  }, [zips]);

  const handleCloseDetail = () => setSelectedZip(null);

  return (
    <div className="discovery">
      <Sidebar activeMetric={activeMetric} onMetricChange={setActiveMetric} />
      <div className="discovery__main">
        <MapView
          zips={zips}
          activeMetric={activeMetric}
          selectedZip={selectedZip}
          onZipSelect={setSelectedZip}
        />
        {selected && (
          <ZipDetailPanel zip={selected} metroAvgPsf={metroAvgPsf} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}
