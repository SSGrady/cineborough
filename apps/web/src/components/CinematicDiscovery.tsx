"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import {
  getPropertiesByZip,
  getPropertyById,
  zipMetricsFromGeoJson,
  loadUsMetrosGeoJson,
  DC_METRO_CBSA,
  ORLANDO_METRO_CBSA,
  loadMetroShard,
  fetchMetroShard,
  sandboxCbsaForZip,
  METRIC_LAYERS,
} from "@cineborough/data";
import {
  resolveMapCamera,
  isOverviewGeography,
  US_CONTINENTAL_BOUNDS,
  US_FULL_BOUNDS,
  US_INSET_CAMERAS,
  ORLANDO_METRO_CAMERA,
  type UsInsetRegion,
} from "@cineborough/geo";
import { MapView } from "./MapView";
import { Sidebar, type GeographyLevel } from "./Sidebar";
import { LocaleQuoteCard } from "./LocaleQuoteCard";
import { ZipDetailPanel } from "./ZipDetailPanel";
import { PropertyValuationPanel } from "./PropertyValuationPanel";
import { UsMapInsets } from "./UsMapInsets";

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

const US_METROS_GEOJSON = loadUsMetrosGeoJson();

const OVERVIEW_HINTS: Partial<Record<GeographyLevel, string>> = {
  national: "Continental US · click a metro to drill in",
  state: "State view · metric label per state",
  metro: "All metros · click a region to open sandbox detail",
  county: "County view · metro boundaries (county ingest pending)",
};

export function CinematicDiscovery({ geoJson }: CinematicDiscoveryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialFitRef = useRef(true);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricLayerKey>("opportunityScore");
  const [activeSection, setActiveSection] = useState<CinematicSection>("metro");
  const [geography, setGeography] = useState<GeographyLevel>("national");
  const [exploreMode, setExploreMode] = useState(false);
  const [sandboxDrillActive, setSandboxDrillActive] = useState(false);
  const [storyCameraActive, setStoryCameraActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [usInsetRegion, setUsInsetRegion] = useState<UsInsetRegion>("continental");
  const [activeSandboxCbsa, setActiveSandboxCbsa] = useState(DC_METRO_CBSA);

  const isOverviewMode = isOverviewGeography(geography) && !sandboxDrillActive;

  const dcStoryActive =
    sandboxDrillActive &&
    storyCameraActive &&
    !exploreMode &&
    activeSandboxCbsa === DC_METRO_CBSA &&
    geography !== "zip";

  const activeShardGeoJson = useMemo(
    () => loadMetroShard(activeSandboxCbsa) ?? geoJson,
    [activeSandboxCbsa, geoJson],
  );

  const activeGeoJson = useMemo(
    () => (isOverviewMode ? US_METROS_GEOJSON : activeShardGeoJson),
    [isOverviewMode, activeShardGeoJson],
  );

  const zips = useMemo(
    () => zipMetricsFromGeoJson(isOverviewMode ? activeGeoJson : activeShardGeoJson),
    [isOverviewMode, activeGeoJson, activeShardGeoJson],
  );

  const selected = useMemo(
    () => zips.find((z) => z.zip === selectedZip),
    [zips, selectedZip],
  );

  const selectedFeature = useMemo(
    () =>
      activeShardGeoJson.features.find((f) => f.properties.zipCode === selectedZip)?.properties,
    [activeShardGeoJson, selectedZip],
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

  const subtitle = useMemo(() => {
    if (exploreMode) return "Explore map · full navigation";
    if (isOverviewMode) {
      return OVERVIEW_HINTS[geography] ?? "United States overview";
    }
    if (!storyCameraActive && sandboxDrillActive) {
      return `${activeShardGeoJson.metadata.metro} · flat view — resume story or pick National`;
    }
    return `${activeShardGeoJson.metadata.metro} · scroll to explore`;
  }, [
    exploreMode,
    isOverviewMode,
    geography,
    storyCameraActive,
    sandboxDrillActive,
    activeShardGeoJson.metadata.metro,
  ]);

  const mapBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (exploreMode) return US_FULL_BOUNDS;
    if (isOverviewMode && geography === "national" && usInsetRegion !== "continental") {
      return US_FULL_BOUNDS;
    }
    if (isOverviewMode) return US_CONTINENTAL_BOUNDS;
    return null;
  }, [exploreMode, isOverviewMode, geography, usInsetRegion]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || isOverviewMode) return;

    const sectionTriggers = SCROLL_SECTIONS.map((section) => {
      const el = root.querySelector<HTMLElement>(`[data-section="${section.id}"]`);
      if (!el) return null;

      return ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          if (!exploreMode && dcStoryActive) setActiveSection(section.id);
        },
        onEnterBack: () => {
          if (!exploreMode && dcStoryActive) setActiveSection(section.id);
        },
      });
    });

    const scrubTrigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.35,
      onUpdate: (self) => {
        if (exploreMode || !dcStoryActive) return;
        setScrollProgress(self.progress);
      },
    });

    ScrollTrigger.refresh();

    return () => {
      sectionTriggers.forEach((t) => t?.kill());
      scrubTrigger.kill();
    };
  }, [exploreMode, dcStoryActive, isOverviewMode]);

  useEffect(() => {
    if (exploreMode || isOverviewMode) return;
    if (activeSection === "neighborhood" || activeSection === "detail") {
      setSelectedZip((prev) => prev ?? "22201");
    }
  }, [activeSection, exploreMode, isOverviewMode]);

  const handleGeographyChange = useCallback((level: GeographyLevel) => {
    if (level === "zip" && !sandboxDrillActive) return;

    setGeography(level);

    if (isOverviewGeography(level)) {
      setSandboxDrillActive(false);
      setStoryCameraActive(false);
      setSelectedZip(null);
      setSelectedPropertyId(null);
      if (level === "national") setUsInsetRegion("continental");
      return;
    }

    if (level === "zip") {
      setSelectedZip((prev) => prev ?? "22201");
    }
  }, [sandboxDrillActive]);

  const handleUserMapMove = useCallback(() => {
    if (exploreMode) return;
    if (dcStoryActive) {
      setStoryCameraActive(false);
    }
  }, [exploreMode, dcStoryActive]);

  const handleResumeDcStory = useCallback(() => {
    setActiveSandboxCbsa(DC_METRO_CBSA);
    setSandboxDrillActive(true);
    setStoryCameraActive(true);
    setGeography("metro");
    setUsInsetRegion("continental");
    setActiveSection("metro");
    setScrollProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);

  const handleInsetSelect = useCallback((region: UsInsetRegion) => {
    setUsInsetRegion(region);
    setGeography("national");
    setSandboxDrillActive(false);
    setStoryCameraActive(false);
  }, []);

  const handleZipSelect = useCallback(
    (regionId: string | null) => {
      if (!regionId) {
        setSelectedZip(null);
        setSelectedPropertyId(null);
        if (sandboxDrillActive) {
          setStoryCameraActive(false);
        }
        return;
      }

      if (isOverviewMode) {
        if (regionId === DC_METRO_CBSA || regionId === ORLANDO_METRO_CBSA) {
          setActiveSandboxCbsa(regionId);
          setSandboxDrillActive(true);
          setStoryCameraActive(regionId === DC_METRO_CBSA);
          setSelectedZip(null);
          setSelectedPropertyId(null);
          setUsInsetRegion("continental");
          if (regionId === DC_METRO_CBSA) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            requestAnimationFrame(() => ScrollTrigger.refresh());
          }
          return;
        }

        void fetchMetroShard(regionId, {
          apiBaseUrl: process.env.NEXT_PUBLIC_METRO_API_BASE_URL,
        }).then((shard) => {
          if (!shard) return;
          setActiveSandboxCbsa(regionId);
          setSandboxDrillActive(true);
          setStoryCameraActive(false);
          setSelectedZip(null);
          setSelectedPropertyId(null);
          setUsInsetRegion("continental");
        });
        return;
      }

      const shard = sandboxCbsaForZip(regionId);
      if (shard) setActiveSandboxCbsa(shard);

      setSelectedZip(regionId);
      setSelectedPropertyId(null);
      setActiveSection("detail");
      setGeography("zip");
      setStoryCameraActive(true);
      setScrollProgress(1);
    },
    [isOverviewMode, sandboxDrillActive],
  );

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
    const f = activeShardGeoJson.features.find(
      (feat) => feat.properties.zipCode === selectedZip,
    );
    if (!f) return null;
    return [f.properties.labelLng, f.properties.labelLat];
  }, [activeShardGeoJson, selectedZip]);

  const cameraTarget = useMemo(() => {
    if (exploreMode) return null;

    if (isOverviewMode) {
      if (geography === "national" && usInsetRegion !== "continental") {
        return { ...US_INSET_CAMERAS[usInsetRegion], duration: 800 };
      }
      return null;
    }

    if (
      sandboxDrillActive &&
      !dcStoryActive &&
      activeSandboxCbsa === ORLANDO_METRO_CBSA &&
      geography !== "zip"
    ) {
      return ORLANDO_METRO_CAMERA;
    }

    return resolveMapCamera({
      geography,
      zipCenter,
      exploreMode,
      cinematicSection: activeSection,
      sandboxCinematicActive: storyCameraActive && sandboxDrillActive,
      dcStoryActive,
      scrollProgress: dcStoryActive ? scrollProgress : null,
    });
  }, [
    geography,
    zipCenter,
    exploreMode,
    activeSection,
    dcStoryActive,
    scrollProgress,
    usInsetRegion,
    activeSandboxCbsa,
    sandboxDrillActive,
    storyCameraActive,
    isOverviewMode,
  ]);

  const pathVisible =
    dcStoryActive &&
    (activeSection === "neighborhood" ||
      activeSection === "detail" ||
      scrollProgress > 0.35);

  const sidebarMode =
    isOverviewMode || (activeSection === "metro" && dcStoryActive) ? "full" : "slim";

  const fitNationalBounds =
    isOverviewMode &&
    usInsetRegion === "continental" &&
    !exploreMode &&
    initialFitRef.current;

  useEffect(() => {
    if (fitNationalBounds) {
      initialFitRef.current = false;
    }
  }, [fitNationalBounds]);

  useEffect(() => {
    document.body.style.overflow = exploreMode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [exploreMode]);

  const handleToggleExplore = useCallback(() => {
    setExploreMode((v) => {
      if (!v) setStoryCameraActive(false);
      return !v;
    });
  }, []);

  const metroDescription =
    !storyCameraActive && sandboxDrillActive
      ? "Story camera paused while you explore. Resume the DC guided tour or switch to National for the US map."
      : SCROLL_SECTIONS[0].description;

  const overviewFeatureCount = activeGeoJson.features.filter(
    (f) => f.properties.medianHomeValue > 0,
  ).length;

  return (
    <>
      <header className="cinematic-header">
        <h1>Cineborough</h1>
        <p>{subtitle}</p>
      </header>

      <div
        className={`cinematic${exploreMode ? " cinematic--explore" : ""}${isOverviewMode ? " cinematic--national" : ""}`}
      >
        <aside className="cinematic__sidebar">
          <Sidebar
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
            mode={sidebarMode}
            geography={geography}
            onGeographyChange={handleGeographyChange}
            selectedZip={selectedZip}
            zips={zips}
            sandboxDrillActive={sandboxDrillActive}
          />
        </aside>

        <div className="cinematic__map">
          <MapView
            geoJson={activeGeoJson}
            activeMetric={activeMetric}
            selectedZip={selectedZip}
            onZipSelect={handleZipSelect}
            cameraTarget={cameraTarget}
            cameraInstant={dcStoryActive}
            pathVisible={pathVisible}
            exploreMode={exploreMode}
            onToggleExploreMode={handleToggleExplore}
            onUserMapMove={handleUserMapMove}
            mapBounds={mapBounds}
            geographyLevel={geography}
            overviewMode={isOverviewMode}
            fitNationalBounds={fitNationalBounds}
            cinematicOnSelect={!isOverviewMode}
          />
          {isOverviewMode && !exploreMode && (
            <div className="national-hint">
              <span className="national-hint__step">
                {geography.charAt(0).toUpperCase() + geography.slice(1)}
              </span>
              <h2>US Metro Overview</h2>
              <p>
                {overviewFeatureCount} metros with live home values ·{" "}
                {METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "metric"} layer.
                Click Washington-Arlington-Alexandria or Orlando to open ZIP sandbox detail.
              </p>
            </div>
          )}
          {isOverviewMode && geography === "national" && !exploreMode && (
            <UsMapInsets activeRegion={usInsetRegion} onSelectRegion={handleInsetSelect} />
          )}
        </div>

        {!isOverviewMode && (
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
                  <p>{section.id === "metro" ? metroDescription : section.description}</p>

                  {section.id === "metro" && !storyCameraActive && sandboxDrillActive && (
                    <button
                      type="button"
                      className="cinematic__resume-btn"
                      onClick={handleResumeDcStory}
                    >
                      Resume DC story
                    </button>
                  )}

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
        )}

        {!isOverviewMode && (
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
        )}
      </div>
    </>
  );
}
