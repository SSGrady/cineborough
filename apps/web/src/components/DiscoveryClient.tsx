"use client";

import { useState } from "react";
import type { MetricLayerKey, ZipMetrics } from "@cineborough/data";
import { MapView } from "./MapView";

interface DiscoveryClientProps {
  zips: ZipMetrics[];
}

export function DiscoveryClient({ zips }: DiscoveryClientProps) {
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [activeMetric] = useState<MetricLayerKey>("opportunityScore");

  return (
    <MapView
      zips={zips}
      activeMetric={activeMetric}
      selectedZip={selectedZip}
      onZipSelect={setSelectedZip}
    />
  );
}
