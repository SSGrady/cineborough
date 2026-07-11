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
  rankNeighborhoods,
  type DiscoveryCriteria,
  type RankedNeighborhood,
} from "@cineborough/data";
import {
  resolveMapCamera,
  isOverviewGeography,
  US_CONTINENTAL_BOUNDS,
  US_FULL_BOUNDS,
  US_INSET_CAMERAS,
  ORLANDO_METRO_CAMERA,
  discoveryFlyoverCamera,
  type GeographyLevel,
  type UsInsetRegion,
} from "@cineborough/geo";
import { MapView } from "./MapView";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ContextChip } from "./ContextChip";
import { StoryDrawer } from "./StoryDrawer";
import { DiscoveryCriteriaPanel } from "./DiscoveryCriteriaPanel";
import { LocaleQuoteCard } from "./LocaleQuoteCard";
import { ZipDetailPanel } from "./ZipDetailPanel";
import { PropertyValuationPanel } from "./PropertyValuationPanel";
import { UsMapInsets } from "./UsMapInsets";
import { buildSearchIndex, type SearchResult } from "@/lib/search-index";
import {
  loadDiscoveryCriteria,
  saveDiscoveryCriteria,
} from "@/lib/discovery-criteria-storage";

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
const SEARCH_INDEX = buildSearchIndex(US_METROS_GEOJSON);

const OVERVIEW_HINTS: Partial<Record<GeographyLevel, string>> = {
  national: "Continental US · click a metro to drill in",
  state: "State view · metric label per state",
  metro: "All metros · click a region to open sandbox detail",
  county: "County view · metro boundaries (county ingest pending)",
};

const SANDBOX_CBSA = new Set([DC_METRO_CBSA, ORLANDO_METRO_CBSA]);

type DiscoveryFlyoverPhase = "flying" | "highlight";

interface DiscoveryFlyoverState {
  results: RankedNeighborhood[];
  index: number;
  phase: DiscoveryFlyoverPhase;
}

const FLYOVER_HIGHLIGHT_MS = 2800;
const FLYOVER_CAMERA_MS = 2200;

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
  const [searchFlyTarget, setSearchFlyTarget] = useState<[number, number] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [criteriaPanelOpen, setCriteriaPanelOpen] = useState(false);
  const [discoveryCriteria, setDiscoveryCriteria] = useState<DiscoveryCriteria>(() =>
    loadDiscoveryCriteria(),
  );
  const [discoveryFlyover, setDiscoveryFlyover] = useState<DiscoveryFlyoverState | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<RankedNeighborhood[] | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);

  const discoveryFlyoverActive = discoveryFlyover !== null;

  const isOverviewMode = isOverviewGeography(geography) && !sandboxDrillActive;

  const dcStoryActive =
    sandboxDrillActive &&
    storyCameraActive &&
    !exploreMode &&
    !discoveryFlyoverActive &&
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
    setSearchFlyTarget(null);

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
    setSearchFlyTarget(null);
  }, [exploreMode, dcStoryActive]);

  const handleResumeDcStory = useCallback(() => {
    setActiveSandboxCbsa(DC_METRO_CBSA);
    setSandboxDrillActive(true);
    setStoryCameraActive(true);
    setGeography("metro");
    setUsInsetRegion("continental");
    setActiveSection("metro");
    setScrollProgress(0);
    setDrawerOpen(false);
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

      setSearchFlyTarget(null);

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

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      if (result.kind === "zip") {
        const shard = sandboxCbsaForZip(result.id);
        if (shard && !sandboxDrillActive) {
          setActiveSandboxCbsa(shard);
          setSandboxDrillActive(true);
          setStoryCameraActive(shard === DC_METRO_CBSA);
          setGeography("metro");
        }
        handleZipSelect(result.id);
        return;
      }

      if (SANDBOX_CBSA.has(result.id)) {
        handleZipSelect(result.id);
        return;
      }

      setGeography("metro");
      setSandboxDrillActive(false);
      setStoryCameraActive(false);
      setSelectedZip(null);
      setSelectedPropertyId(null);
      setSearchFlyTarget([result.lng, result.lat]);
    },
    [handleZipSelect, sandboxDrillActive],
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
    setDrawerOpen(true);
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

    if (discoveryFlyover) {
      const current = discoveryFlyover.results[discoveryFlyover.index];
      if (current) return discoveryFlyoverCamera(current.center);
    }

    if (searchFlyTarget) {
      return {
        center: searchFlyTarget,
        zoom: 7.5,
        pitch: 0,
        bearing: 0,
        duration: 900,
      };
    }

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
    searchFlyTarget,
    discoveryFlyover,
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

  const handleApplyCriteria = useCallback((criteria: DiscoveryCriteria) => {
    setDiscoveryCriteria(criteria);
    saveDiscoveryCriteria(criteria);
  }, []);

  const handleDiscover = useCallback(() => {
    setDiscoveryMessage(null);

    if (isOverviewMode || !SANDBOX_CBSA.has(activeSandboxCbsa)) {
      setDiscoveryMessage("Open Washington-Arlington-Alexandria or Orlando sandbox metro first");
      return;
    }

    setStoryCameraActive(false);
    setSearchFlyTarget(null);

    const results = rankNeighborhoods(activeShardGeoJson, discoveryCriteria, 3);
    const passing = results.filter((r) => r.passedFilters);

    if (passing.length === 0) {
      setDiscoveryResults(results);
      setDiscoveryMessage("No neighborhoods match your criteria — relax filters and try again");
      setDrawerOpen(true);
      return;
    }

    setDiscoveryResults(passing);
    setSandboxDrillActive(true);
    setGeography("zip");
    setSelectedZip(passing[0].zip);
    setDiscoveryFlyover({ results: passing, index: 0, phase: "flying" });
  }, [isOverviewMode, activeSandboxCbsa, activeShardGeoJson, discoveryCriteria]);

  const handleSkipFlyover = useCallback(() => {
    setDiscoveryFlyover(null);
  }, []);

  useEffect(() => {
    if (!discoveryFlyover) return;

    const current = discoveryFlyover.results[discoveryFlyover.index];
    if (!current) {
      setDiscoveryFlyover(null);
      return;
    }

    if (discoveryFlyover.phase === "flying") {
      const timer = window.setTimeout(() => {
        setDiscoveryFlyover((prev) => (prev ? { ...prev, phase: "highlight" } : null));
      }, FLYOVER_CAMERA_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setDiscoveryFlyover((prev) => {
        if (!prev) return null;
        const nextIndex = prev.index + 1;
        if (nextIndex >= prev.results.length) return null;
        setSelectedZip(prev.results[nextIndex].zip);
        return { ...prev, index: nextIndex, phase: "flying" };
      });
    }, FLYOVER_HIGHLIGHT_MS);

    return () => window.clearTimeout(timer);
  }, [discoveryFlyover]);

  const metroDescription =
    !storyCameraActive && sandboxDrillActive
      ? "Story camera paused while you explore. Resume the DC guided tour or switch to National for the US map."
      : SCROLL_SECTIONS[0].description;

  const overviewFeatureCount = activeGeoJson.features.filter(
    (f) => f.properties.medianHomeValue > 0,
  ).length;

  const activeScrollSection = SCROLL_SECTIONS.find((s) => s.id === activeSection);

  const contextChip = useMemo(() => {
    if (discoveryFlyover) {
      const current = discoveryFlyover.results[discoveryFlyover.index];
      const phaseLabel =
        discoveryFlyover.phase === "flying" ? "Flying in…" : "Neighborhood highlight";
      return {
        stepLabel: `${discoveryFlyover.index + 1} / ${discoveryFlyover.results.length}`,
        title: `#${current.rank} · ${current.zip} — ${current.name}`,
        detail: `${phaseLabel} · score ${current.score} · cap ${current.metrics.capRate}% · walk ${current.metrics.walkabilityScore}`,
        canOpen: true,
        action: { label: "Skip tour", onClick: handleSkipFlyover },
      };
    }

    if (discoveryMessage) {
      return {
        stepLabel: "Discovery",
        title: discoveryMessage,
        detail: "Adjust criteria or drill into DC / Orlando sandbox",
        canOpen: true,
        action: { label: "Criteria", onClick: () => setCriteriaPanelOpen(true) },
      };
    }

    if (isOverviewMode) {
      const metricLabel =
        METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "metric";
      return {
        stepLabel: geography.charAt(0).toUpperCase() + geography.slice(1),
        title: "US Metro Overview",
        detail: `${overviewFeatureCount} metros · ${metricLabel}`,
        canOpen: true,
      };
    }

    if (dcStoryActive) {
      return {
        stepLabel: `${SCROLL_SECTIONS.findIndex((s) => s.id === activeSection) + 1} / ${SCROLL_SECTIONS.length}`,
        title: activeScrollSection?.title ?? "DC Story",
        detail: activeScrollSection?.description,
        canOpen: true,
        action:
          !storyCameraActive && sandboxDrillActive
            ? { label: "Resume", onClick: handleResumeDcStory }
            : undefined,
      };
    }

    if (selected) {
      return {
        stepLabel: "ZIP",
        title: `${selected.zip} — ${selected.name}`,
        detail: activeShardGeoJson.metadata.metro,
        canOpen: true,
      };
    }

    return {
      stepLabel: "Sandbox",
      title: activeShardGeoJson.metadata.metro,
      detail: storyCameraActive ? "Guided story · scroll to explore" : "Flat view",
      canOpen: true,
      action:
        !storyCameraActive && sandboxDrillActive && activeSandboxCbsa === DC_METRO_CBSA
          ? { label: "Resume", onClick: handleResumeDcStory }
          : undefined,
    };
  }, [
    isOverviewMode,
    geography,
    overviewFeatureCount,
    activeMetric,
    dcStoryActive,
    activeSection,
    activeScrollSection,
    storyCameraActive,
    sandboxDrillActive,
    selected,
    activeShardGeoJson.metadata.metro,
    activeSandboxCbsa,
    handleResumeDcStory,
    discoveryFlyover,
    discoveryMessage,
    handleSkipFlyover,
  ]);

  const drawerContent = useMemo(() => {
    if (discoveryResults && discoveryResults.length > 0) {
      return (
        <>
          <p>Top matches from hybrid scoring (financial + hope-core weights).</p>
          <ol className="discovery-results">
            {discoveryResults.map((r) => (
              <li key={r.zip} className="discovery-results__item">
                <button type="button" onClick={() => handleZipSelect(r.zip)}>
                  <strong>
                    #{r.rank} {r.zip} — {r.name}
                  </strong>
                  {!r.passedFilters && (
                    <span className="discovery-results__fail"> · filtered out</span>
                  )}
                </button>
                <span className="discovery-results__score">Score {r.score}</span>
                <ul className="discovery-results__breakdown">
                  <li>Cap rate norm: {r.breakdown.capRate.toFixed(0)}</li>
                  <li>Overvaluation norm: {r.breakdown.overvaluation.toFixed(0)}</li>
                  <li>Walkability norm: {r.breakdown.walkability.toFixed(0)}</li>
                  <li>Remote work norm: {r.breakdown.remoteWork.toFixed(0)}</li>
                  <li>Forecast norm: {r.breakdown.forecast.toFixed(0)}</li>
                </ul>
                {r.filterReasons.length > 0 && (
                  <p className="discovery-results__reasons">{r.filterReasons.join(" · ")}</p>
                )}
              </li>
            ))}
          </ol>
        </>
      );
    }

    if (isOverviewMode) {
      return (
        <>
          <p>
            {overviewFeatureCount} metros with live home values ·{" "}
            {METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "metric"} layer.
            Click Washington-Arlington-Alexandria or Orlando to open ZIP sandbox detail.
          </p>
        </>
      );
    }

    if (selected) {
      if (selectedProperty) {
        return <PropertyValuationPanel property={selectedProperty} onBack={handleBackToZip} />;
      }
      return (
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
      );
    }

    const section = activeScrollSection ?? SCROLL_SECTIONS[0];
    return (
      <>
        <p>{section.id === "metro" ? metroDescription : section.description}</p>
        {!storyCameraActive && sandboxDrillActive && activeSandboxCbsa === DC_METRO_CBSA && (
          <button type="button" className="cinematic__resume-btn" onClick={handleResumeDcStory}>
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
      </>
    );
  }, [
    isOverviewMode,
    overviewFeatureCount,
    activeMetric,
    selected,
    selectedProperty,
    selectedFeature,
    metroAvgPsf,
    zipProperties,
    activeScrollSection,
    metroDescription,
    storyCameraActive,
    sandboxDrillActive,
    activeSandboxCbsa,
    zips,
    selectedZip,
    handleResumeDcStory,
    handleZipSelect,
    handleEvaluateProperty,
    discoveryResults,
  ]);

  return (
    <>
      <TopBar
        subtitle={subtitle}
        geography={geography}
        onGeographyChange={handleGeographyChange}
        sandboxDrillActive={sandboxDrillActive}
        searchIndex={SEARCH_INDEX}
        onSearchSelect={handleSearchSelect}
        onOpenCriteria={() => setCriteriaPanelOpen(true)}
        onDiscover={handleDiscover}
        discoverDisabled={discoveryFlyoverActive}
        discoverLabel={discoveryFlyoverActive ? "Tour in progress…" : "Find neighborhoods"}
      />

      <div
        className={`cinematic${exploreMode ? " cinematic--explore" : ""}${isOverviewMode ? " cinematic--national" : ""}`}
      >
        <aside className="cinematic__sidebar">
          <Sidebar
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
            mode={sidebarMode}
            selectedZip={selectedZip}
            zips={zips}
          />
        </aside>

        <div className="cinematic__map">
          <ContextChip
            stepLabel={contextChip.stepLabel}
            title={contextChip.title}
            detail={contextChip.detail}
            onOpenDrawer={contextChip.canOpen ? () => setDrawerOpen(true) : undefined}
            action={contextChip.action}
          />
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
          {isOverviewMode && geography === "national" && !exploreMode && (
            <UsMapInsets activeRegion={usInsetRegion} onSelectRegion={handleInsetSelect} />
          )}
        </div>

        {!isOverviewMode && dcStoryActive && (
          <div ref={scrollRef} className="cinematic__scroll" aria-hidden={exploreMode}>
            {SCROLL_SECTIONS.map((section) => (
              <section
                key={section.id}
                className="cinematic__section cinematic__section--spacer"
                data-section={section.id}
                aria-current={activeSection === section.id ? "step" : undefined}
              />
            ))}
          </div>
        )}

        {!isOverviewMode && dcStoryActive && (
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

      <StoryDrawer
        open={drawerOpen}
        title={contextChip.title}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </StoryDrawer>

      <DiscoveryCriteriaPanel
        open={criteriaPanelOpen}
        criteria={discoveryCriteria}
        onClose={() => setCriteriaPanelOpen(false)}
        onApply={handleApplyCriteria}
      />
    </>
  );
}
