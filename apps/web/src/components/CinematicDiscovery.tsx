"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import { getPropertiesByZip, getPropertyById, zipMetricsFromGeoJson } from "@cineborough/data";
import { resolveMapCamera } from "@cineborough/geo";
import { MapView } from "./MapView";
import { Sidebar, type GeographyLevel } from "./Sidebar";
import { LocaleQuoteCard } from "./LocaleQuoteCard";
import { ZipDetailPanel } from "./ZipDetailPanel";
import { PropertyValuationPanel } from "./PropertyValuationPanel";

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
      "Scroll to descend into neighborhoods. Click any ZIP on the map to jump ahead to detail.",
  },
  {
    id: "neighborhood",
    title: "Neighborhood Descent",
    description:
      "Arlington corridors come into focus. Click ZIPs to compare metrics without scrolling.",
  },
  {
    id: "detail",
    title: "Neighborhood Detail",
    description:
      "Click ZIPs on the map or use chips below to compare. Sidebar toggles re-color the choropleth instantly.",
  },
];

interface CinematicDiscoveryProps {
  geoJson: DcMetroGeoJson;
}

export function CinematicDiscovery({ geoJson }: CinematicDiscoveryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zips = useMemo(() => zipMetricsFromGeoJson(geoJson), [geoJson]);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricLayerKey>("opportunityScore");
  const [activeSection, setActiveSection] = useState<CinematicSection>("metro");
  const [geography, setGeography] = useState<GeographyLevel>("metro");
  const [exploreMode, setExploreMode] = useState(false);
  const [geographyOverride, setGeographyOverride] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const selected = useMemo(
    () => zips.find((z) => z.zip === selectedZip),
    [zips, selectedZip],
  );

  const selectedFeature = useMemo(
    () => geoJson.features.find((f) => f.properties.zipCode === selectedZip)?.properties,
    [geoJson, selectedZip],
  );

  const metroAvgPsf = useMemo(() => {
    if (zips.length === 0) return 0;
    return zips.reduce((sum, z) => sum + z.marketPsf, 0) / zips.length;
  }, [zips]);

  const zipProperties = useMemo(
    () => (selectedZip ? getPropertiesByZip(selectedZip) : []),
    [selectedZip],
  );

  const selectedProperty = useMemo(
    () => (selectedPropertyId ? getPropertyById(selectedPropertyId) : undefined),
    [selectedPropertyId],
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const sectionTriggers = SCROLL_SECTIONS.map((section) => {
      const el = root.querySelector<HTMLElement>(`[data-section="${section.id}"]`);
      if (!el) return null;

      return ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          if (!exploreMode) setActiveSection(section.id);
        },
        onEnterBack: () => {
          if (!exploreMode) setActiveSection(section.id);
        },
      });
    });

    const scrubTrigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.35,
      onUpdate: (self) => {
        if (!exploreMode && !geographyOverride) {
          setScrollProgress(self.progress);
        }
      },
    });

    ScrollTrigger.refresh();

    return () => {
      sectionTriggers.forEach((t) => t?.kill());
      scrubTrigger.kill();
    };
  }, [exploreMode, geographyOverride]);

  useEffect(() => {
    if (exploreMode) return;
    if (activeSection === "neighborhood" || activeSection === "detail") {
      setSelectedZip((prev) => prev ?? "22201");
    }
  }, [activeSection, exploreMode]);

  const handleGeographyChange = useCallback((level: GeographyLevel) => {
    setGeography(level);
    setGeographyOverride(level !== "metro");
    if (level === "zip") {
      setSelectedZip((prev) => prev ?? "22201");
    }
    if (level === "metro") {
      setGeographyOverride(false);
    }
  }, []);

  const handleZipSelect = useCallback((zipCode: string | null) => {
    setSelectedZip(zipCode);
    setSelectedPropertyId(null);
    if (zipCode) {
      setActiveSection("detail");
      setGeography("zip");
      setGeographyOverride(false);
      setScrollProgress(1);
    }
  }, []);

  const handleCloseDetail = () => {
    setSelectedZip(null);
    setSelectedPropertyId(null);
  };

  const handleEvaluateProperty = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setActiveSection("detail");
    setGeography("zip");
    setScrollProgress(1);
  }, []);

  const handleBackToZip = () => setSelectedPropertyId(null);

  const zipCenter = useMemo((): [number, number] | null => {
    if (!selectedZip) return null;
    const f = geoJson.features.find((feat) => feat.properties.zipCode === selectedZip);
    if (!f) return null;
    return [f.properties.labelLng, f.properties.labelLat];
  }, [geoJson, selectedZip]);

  const cameraTarget = useMemo(
    () =>
      resolveMapCamera({
        geography,
        zipCenter,
        exploreMode,
        cinematicSection: activeSection,
        geographyOverride,
        scrollProgress: geographyOverride ? null : scrollProgress,
      }),
    [geography, zipCenter, exploreMode, activeSection, geographyOverride, scrollProgress],
  );

  const pathVisible =
    !exploreMode &&
    !geographyOverride &&
    (activeSection === "neighborhood" ||
      activeSection === "detail" ||
      scrollProgress > 0.35);
  const sidebarMode = activeSection === "metro" && !exploreMode ? "full" : "slim";

  useEffect(() => {
    document.body.style.overflow = exploreMode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [exploreMode]);

  const handleToggleExplore = useCallback(() => {
    setExploreMode((v) => {
      if (!v) setGeographyOverride(false);
      return !v;
    });
  }, []);

  return (
    <div className={`cinematic${exploreMode ? " cinematic--explore" : ""}`}>
      <aside className="cinematic__sidebar">
        <Sidebar
          activeMetric={activeMetric}
          onMetricChange={setActiveMetric}
          mode={sidebarMode}
          geography={geography}
          onGeographyChange={handleGeographyChange}
          selectedZip={selectedZip}
          zips={zips}
        />
      </aside>

      <div className="cinematic__map">
        <MapView
          geoJson={geoJson}
          activeMetric={activeMetric}
          selectedZip={selectedZip}
          onZipSelect={handleZipSelect}
          cameraTarget={cameraTarget}
          cameraInstant={!geographyOverride && !exploreMode}
          pathVisible={pathVisible}
          exploreMode={exploreMode}
          onToggleExploreMode={handleToggleExplore}
        />
      </div>

      <div ref={scrollRef} className="cinematic__scroll" aria-hidden={exploreMode}>
        {SCROLL_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            className="cinematic__section"
            data-section={section.id}
            aria-current={activeSection === section.id ? "step" : undefined}
          >
            <div
              className={
                section.id === "detail" && selectedProperty
                  ? "cinematic__section-panel cinematic__section-panel--wide"
                  : "cinematic__section-panel"
              }
            >
              <span className="cinematic__section-step">
                {index + 1} / {SCROLL_SECTIONS.length}
              </span>
              <h2>{section.title}</h2>
              <p>{section.description}</p>

              {(section.id === "neighborhood" || section.id === "detail") && (
                <div className="zip-chips" role="group" aria-label="Quick ZIP compare">
                  {zips.map((z) => (
                    <button
                      key={z.zip}
                      type="button"
                      className={`zip-chip${selectedZip === z.zip ? " zip-chip--active" : ""}`}
                      onClick={() => handleZipSelect(z.zip)}
                    >
                      {z.zip}
                    </button>
                  ))}
                </div>
              )}

              {section.id === "detail" && selected && (
                <>
                  {selectedProperty ? (
                    <PropertyValuationPanel
                      property={selectedProperty}
                      onBack={handleBackToZip}
                    />
                  ) : (
                    <>
                      <ZipDetailPanel
                        zip={selected}
                        metroAvgPsf={metroAvgPsf}
                        onClose={handleCloseDetail}
                        embedded
                        featureProps={selectedFeature}
                        properties={zipProperties}
                        onEvaluateProperty={handleEvaluateProperty}
                      />
                      <LocaleQuoteCard
                        zip={selected.zip}
                        quoteText={selectedFeature?.localQuote}
                        primaryVibe={selectedFeature?.primaryVibe}
                        neighborhood={selectedFeature?.neighborhoodName}
                      />
                    </>
                  )}
                </>
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
