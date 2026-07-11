"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import { getPropertiesByZip, getPropertyById, zipMetricsFromGeoJson, loadUsMetrosGeoJson, DC_METRO_CBSA, ORLANDO_METRO_CBSA, loadMetroShard, sandboxCbsaForZip, METRIC_LAYERS } from "@cineborough/data";
import {
  resolveMapCamera,
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

export function CinematicDiscovery({ geoJson }: CinematicDiscoveryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricLayerKey>("opportunityScore");
  const [activeSection, setActiveSection] = useState<CinematicSection>("metro");
  const [geography, setGeography] = useState<GeographyLevel>("metro");
  const [exploreMode, setExploreMode] = useState(false);
  const [geographyOverride, setGeographyOverride] = useState(false);
  const [storyCameraActive, setStoryCameraActive] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [usInsetRegion, setUsInsetRegion] = useState<UsInsetRegion>("continental");
  const [activeSandboxCbsa, setActiveSandboxCbsa] = useState(DC_METRO_CBSA);

  const dcStoryActive =
    storyCameraActive &&
    geography === "metro" &&
    !exploreMode &&
    !geographyOverride &&
    activeSandboxCbsa === DC_METRO_CBSA;

  const isNationalView = geography === "national";

  const activeShardGeoJson = useMemo(
    () => loadMetroShard(activeSandboxCbsa) ?? geoJson,
    [activeSandboxCbsa, geoJson],
  );

  const activeGeoJson = useMemo(
    () => (isNationalView ? US_METROS_GEOJSON : geoJson),
    [isNationalView, geoJson],
  );

  const zips = useMemo(
    () => zipMetricsFromGeoJson(isNationalView ? activeGeoJson : activeShardGeoJson),
    [isNationalView, activeGeoJson, activeShardGeoJson],
  );

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

  const subtitle = useMemo(() => {
    if (exploreMode) return "Explore map · full navigation";
    if (geography === "national") return "United States · lower 48 + AK & HI";
    if (geography === "state") return "State view · select a metro to dive in";
    if (!storyCameraActive && geography === "metro") {
      return `${activeShardGeoJson.metadata.metro} · story paused — pan freely or resume`;
    }
    return `${activeShardGeoJson.metadata.metro} · scroll to explore`;
  }, [exploreMode, geography, storyCameraActive, activeShardGeoJson.metadata.metro]);

  const mapBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (exploreMode) return US_FULL_BOUNDS;
    if (geography === "national" && usInsetRegion !== "continental") return US_FULL_BOUNDS;
    return US_CONTINENTAL_BOUNDS;
  }, [exploreMode, geography, usInsetRegion]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || isNationalView) return;

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
  }, [exploreMode, dcStoryActive, isNationalView]);

  useEffect(() => {
    if (exploreMode || isNationalView) return;
    if (activeSection === "neighborhood" || activeSection === "detail") {
      setSelectedZip((prev) => prev ?? "22201");
    }
  }, [activeSection, exploreMode, isNationalView]);

  const handleGeographyChange = useCallback((level: GeographyLevel) => {
    setGeography(level);
    if (level === "national") {
      setGeographyOverride(true);
      setStoryCameraActive(false);
      setUsInsetRegion("continental");
      setSelectedZip(null);
      setSelectedPropertyId(null);
      return;
    }
    if (level === "metro") {
      setActiveSandboxCbsa(DC_METRO_CBSA);
      setGeographyOverride(false);
      setStoryCameraActive(true);
      setUsInsetRegion("continental");
      return;
    }
    setGeographyOverride(true);
    setStoryCameraActive(false);
    if (level === "zip") {
      setSelectedZip((prev) => prev ?? "22201");
    }
  }, []);

  const handleUserMapMove = useCallback(() => {
    if (exploreMode) return;
    if (geography === "metro" && storyCameraActive) {
      setStoryCameraActive(false);
      setGeographyOverride(true);
    }
  }, [exploreMode, geography, storyCameraActive]);

  const handleResumeDcStory = useCallback(() => {
    setActiveSandboxCbsa(DC_METRO_CBSA);
    setStoryCameraActive(true);
    setGeography("metro");
    setGeographyOverride(false);
    setUsInsetRegion("continental");
    setActiveSection("metro");
    setScrollProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);

  const handleInsetSelect = useCallback((region: UsInsetRegion) => {
    setUsInsetRegion(region);
    setGeography("national");
    setGeographyOverride(true);
    setStoryCameraActive(false);
  }, []);

  const handleZipSelect = useCallback(
    (regionId: string | null) => {
      if (!regionId) {
        setSelectedZip(null);
        setSelectedPropertyId(null);
        return;
      }

      if (isNationalView) {
        if (regionId === DC_METRO_CBSA || regionId === ORLANDO_METRO_CBSA) {
          setActiveSandboxCbsa(regionId);
          setGeography("metro");
          setGeographyOverride(regionId === ORLANDO_METRO_CBSA);
          setStoryCameraActive(regionId === DC_METRO_CBSA);
          setSelectedZip(null);
          setSelectedPropertyId(null);
          setUsInsetRegion("continental");
          if (regionId === DC_METRO_CBSA) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            requestAnimationFrame(() => ScrollTrigger.refresh());
          }
        }
        return;
      }

      const shard = sandboxCbsaForZip(regionId);
      if (shard) setActiveSandboxCbsa(shard);

      setSelectedZip(regionId);
      setSelectedPropertyId(null);
      setActiveSection("detail");
      setGeography("zip");
      setGeographyOverride(false);
      setStoryCameraActive(true);
      setScrollProgress(1);
    },
    [isNationalView],
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
    const f = geoJson.features.find((feat) => feat.properties.zipCode === selectedZip);
    if (!f) return null;
    return [f.properties.labelLng, f.properties.labelLat];
  }, [geoJson, selectedZip]);

  const cameraTarget = useMemo(() => {
    if (exploreMode) return null;

    if (geography === "national" && geographyOverride) {
      if (usInsetRegion === "continental") return null;
      return { ...US_INSET_CAMERAS[usInsetRegion], duration: 800 };
    }

    if (
      geographyOverride &&
      geography === "metro" &&
      !dcStoryActive &&
      activeSandboxCbsa === ORLANDO_METRO_CBSA
    ) {
      return ORLANDO_METRO_CAMERA;
    }

    return resolveMapCamera({
      geography,
      zipCenter,
      exploreMode,
      cinematicSection: activeSection,
      geographyOverride,
      dcStoryActive,
      scrollProgress: dcStoryActive ? scrollProgress : null,
    });
  }, [
    geography,
    zipCenter,
    exploreMode,
    activeSection,
    geographyOverride,
    dcStoryActive,
    scrollProgress,
    usInsetRegion,
    activeSandboxCbsa,
  ]);

  const pathVisible =
    dcStoryActive &&
    (activeSection === "neighborhood" ||
      activeSection === "detail" ||
      scrollProgress > 0.35);
  const sidebarMode =
    isNationalView || (activeSection === "metro" && dcStoryActive) ? "full" : "slim";

  useEffect(() => {
    document.body.style.overflow = exploreMode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [exploreMode]);

  const handleToggleExplore = useCallback(() => {
    setExploreMode((v) => {
      if (!v) {
        setGeographyOverride(false);
        setStoryCameraActive(false);
      }
      return !v;
    });
  }, []);

  const metroDescription =
    !storyCameraActive && geography === "metro"
      ? "Story camera paused while you explore. Resume the DC guided tour or switch to National for the US map."
      : SCROLL_SECTIONS[0].description;

  return (
    <>
      <header className="cinematic-header">
        <h1>Cineborough</h1>
        <p>{subtitle}</p>
      </header>

      <div
        className={`cinematic${exploreMode ? " cinematic--explore" : ""}${isNationalView ? " cinematic--national" : ""}`}
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
            fitNationalBounds={isNationalView && usInsetRegion === "continental" && !exploreMode}
          />
          {isNationalView && !exploreMode && (
            <div className="national-hint">
              <span className="national-hint__step">National</span>
              <h2>US Metro Overview</h2>
              <p>
                {activeGeoJson.features.length} metros colored by {METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "metric"}.
                Click Washington-Arlington-Alexandria or Orlando-Kissimmee-Sanford to open a metro sandbox.
              </p>
            </div>
          )}
          {isNationalView && !exploreMode && (
            <UsMapInsets activeRegion={usInsetRegion} onSelectRegion={handleInsetSelect} />
          )}
        </div>

        {!isNationalView && (
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

                {section.id === "metro" && !storyCameraActive && geography === "metro" && (
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

        {!isNationalView && (
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
