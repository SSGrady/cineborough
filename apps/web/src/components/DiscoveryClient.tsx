"use client";

import { useMemo, useState } from "react";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import { zipMetricsFromGeoJson } from "@cineborough/data";
import { MapView } from "./MapView";
import { Sidebar } from "./Sidebar";
import { ZipDetailPanel } from "./ZipDetailPanel";

interface DiscoveryClientProps {
  geoJson: DcMetroGeoJson;
}

export function DiscoveryClient({ geoJson }: DiscoveryClientProps) {
  const zips = useMemo(() => zipMetricsFromGeoJson(geoJson), [geoJson]);
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
      <Sidebar activeMetric={activeMetric} onMetricChange={setActiveMetric} zips={zips} />
      <div className="discovery__main">
        <MapView
          geoJson={geoJson}
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
