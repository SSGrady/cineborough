"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import { zipMetricsFromGeoJson } from "@cineborough/data";
import { CINEMATIC_CAMERAS } from "@cineborough/geo";
import { MapView } from "./MapView";
import { Sidebar, type GeographyLevel } from "./Sidebar";
import { LocaleQuoteCard } from "./LocaleQuoteCard";
import { ZipDetailPanel } from "./ZipDetailPanel";

gsap.registerPlugin(ScrollTrigger);

export type CinematicSection = "metro" | "neighborhood" | "detail";

interface ScrollSection {
  id: CinematicSection;
  title: string;
  description: string;
}

const SCROLL_SECTIONS: ScrollSection[] = [
  {
    id: "metro",
    title: "Metro Overview",
    description:
      "Scan the DC metro sandbox for opportunity zones. Toggle investor and hope-core layers in the sidebar.",
  },
  {
    id: "neighborhood",
    title: "Neighborhood Descent",
    description:
      "Scroll deeper into Arlington — Clarendon (22201) leads the sandbox on Opportunity Index.",
  },
  {
    id: "detail",
    title: "Neighborhood Detail",
    description:
      "Click a ZIP to compare metrics. Zip-level signals reveal where the math works and people like you are buying.",
  },
];

interface CinematicDiscoveryProps {
  geoJson: DcMetroGeoJson;
}

export function CinematicDiscovery({ geoJson }: CinematicDiscoveryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zips = useMemo(() => zipMetricsFromGeoJson(geoJson), [geoJson]);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricLayerKey>("opportunityScore");
  const [activeSection, setActiveSection] = useState<CinematicSection>("metro");
  const [geography, setGeography] = useState<GeographyLevel>("metro");

  const selected = useMemo(
    () => zips.find((z) => z.zip === selectedZip),
    [zips, selectedZip],
  );

  const metroAvgPsf = useMemo(() => {
    if (zips.length === 0) return 0;
    return zips.reduce((sum, z) => sum + z.marketPsf, 0) / zips.length;
  }, [zips]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const triggers = SCROLL_SECTIONS.map((section) => {
      const el = root.querySelector<HTMLElement>(`[data-section="${section.id}"]`);
      if (!el) return null;

      return ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveSection(section.id),
        onEnterBack: () => setActiveSection(section.id),
      });
    });

    return () => {
      triggers.forEach((t) => t?.kill());
    };
  }, []);

  useEffect(() => {
    if (activeSection === "neighborhood" || activeSection === "detail") {
      setSelectedZip((prev) => prev ?? "22201");
      setGeography("zip");
    } else {
      setGeography("metro");
    }
  }, [activeSection]);

  const handleCloseDetail = () => setSelectedZip(null);

  const cameraTarget = CINEMATIC_CAMERAS[activeSection];
  const pathVisible = activeSection === "neighborhood" || activeSection === "detail";
  const sidebarMode = activeSection === "metro" ? "full" : "slim";

  return (
    <div className="cinematic">
      <aside className="cinematic__sidebar">
        <Sidebar
          activeMetric={activeMetric}
          onMetricChange={setActiveMetric}
          mode={sidebarMode}
          geography={geography}
          onGeographyChange={setGeography}
          selectedZip={selectedZip}
          zips={zips}
        />
      </aside>

      <div className="cinematic__map" aria-hidden="true">
        <MapView
          geoJson={geoJson}
          activeMetric={activeMetric}
          selectedZip={selectedZip}
          onZipSelect={setSelectedZip}
          cameraTarget={cameraTarget}
          pathVisible={pathVisible}
        />
      </div>

      <div ref={scrollRef} className="cinematic__scroll">
        {SCROLL_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            className="cinematic__section"
            data-section={section.id}
            aria-current={activeSection === section.id ? "step" : undefined}
          >
            <div className="cinematic__section-panel">
              <span className="cinematic__section-step">
                {index + 1} / {SCROLL_SECTIONS.length}
              </span>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              {section.id === "detail" && (
                <LocaleQuoteCard zip={selectedZip ?? "22201"} />
              )}
              {section.id === "detail" && selected && (
                <ZipDetailPanel
                  zip={selected}
                  metroAvgPsf={metroAvgPsf}
                  onClose={handleCloseDetail}
                  embedded
                />
              )}
            </div>
          </section>
        ))}
      </div>

      <nav className="cinematic__progress" aria-label="Scroll progress">
        {SCROLL_SECTIONS.map((section) => (
          <span
            key={section.id}
            className={
              activeSection === section.id
                ? "cinematic__progress-dot cinematic__progress-dot--active"
                : "cinematic__progress-dot"
            }
            title={section.title}
          />
        ))}
      </nav>
    </div>
  );
}
