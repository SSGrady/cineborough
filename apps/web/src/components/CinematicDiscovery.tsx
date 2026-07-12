"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import {
  getPropertiesByZip,
  getPropertyById,
  zipMetricsFromGeoJson,
  getNeighborhoodPhoto,
  loadUsMetrosGeoJson,
  buildStateChoroplethFromMetros,
  buildCountyChoropleth,
  buildNationalChoroplethFromMetros,
  loadMetroShardsGeoJson,
  DC_METRO_CBSA,
  ORLANDO_METRO_CBSA,
  SF_METRO_CBSA,
  SAN_JOSE_METRO_CBSA,
  loadMetroShard,
  fetchMetroShard,
  sandboxCbsaForZip,
  sandboxCbsaForCounty,
  METRIC_LAYERS,
  rankNeighborhoods,
  type DiscoveryCriteria,
  type DiscoveryFilterMetric,
  type RankedNeighborhood,
  discoveryCriteriaForSandbox,
  getDiscoveryMetricLabel,
  getRawMetricFromFeature,
} from "@cineborough/data";
import {
  resolveMapCamera,
  isOverviewGeography,
  buildOverviewRestoreCamera,
  buildSandboxFlatRestore,
  buildBackgroundClickRestore,
  centroidFromGeoJsonGeometry,
  isFiniteLngLat,
  isValidCameraTarget,
  sanitizeCameraTarget,
  US_CONTINENTAL_BOUNDS,
  US_FULL_BOUNDS,
  US_INSET_CAMERAS,
  SANDBOX_METRO_CAMERAS,
  CINEMATIC_CAMERAS,
  discoveryFlyoverCamera,
  type GeographyLevel,
  type UsInsetRegion,
  type MapCameraTarget,
} from "@cineborough/geo";
import { MapView } from "./MapView";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ContextChip } from "./ContextChip";
import { StoryDrawer } from "./StoryDrawer";
import { CriteriaPanel } from "./CriteriaPanel";
import { MatchesList } from "./MatchesList";
import { CompareChips } from "./CompareChips";
import { LocaleQuoteCard } from "./LocaleQuoteCard";
import { ZipDetailPanel } from "./ZipDetailPanel";
import { PropertyValuationPanel } from "./PropertyValuationPanel";
import { UsMapInsets } from "./UsMapInsets";
import { AnalyticsOverlay } from "./AnalyticsOverlay";
import { DiscoveryAnalyticsPanel } from "./DiscoveryAnalyticsPanel";
import { NeighborhoodPhotoHero } from "./NeighborhoodPhotoHero";
import { CinematicEntryBar } from "./CinematicEntryBar";
import { Google3DTilesBadge } from "./Google3DTilesBadge";
import {
  is3DTilesFlagEnabled,
  is3DTilesActive,
  isPhotoHeroEnabled,
} from "@/lib/cinematic-flags";
import { getGoogle3DTilesStatus } from "@/lib/google-3d-tiles";
import { buildSearchIndex, type SearchResult } from "@/lib/search-index";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  loadDiscoveryCriteria,
  saveDiscoveryCriteria,
} from "@/lib/discovery-criteria-storage";
import {
  loadDiscoveryFavorites,
  saveDiscoveryFavorites,
} from "@/lib/discovery-favorites-storage";

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
const SANDBOX_SHARDS_GEOJSON = loadMetroShardsGeoJson();
const SEARCH_INDEX = buildSearchIndex(US_METROS_GEOJSON);

const OVERVIEW_HINTS: Partial<Record<GeographyLevel, string>> = {
  national: "Continental US · click a metro to drill in",
  state: "State view · metric label per state",
  metro: "All metros · click a region to open sandbox detail",
  county: "County view · national counties · click sandbox county to drill in",
};

const SANDBOX_CBSA = new Set([DC_METRO_CBSA, ORLANDO_METRO_CBSA, SF_METRO_CBSA, SAN_JOSE_METRO_CBSA]);

type DiscoveryFlyoverPhase = "flying" | "highlight";

interface DiscoveryFlyoverState {
  results: RankedNeighborhood[];
  index: number;
  phase: DiscoveryFlyoverPhase;
}

const FLYOVER_HIGHLIGHT_MS = 2800;
const FLYOVER_CAMERA_MS = 2200;

function formatActiveMetricValue(key: MetricLayerKey, value: number): string {
  const layer = METRIC_LAYERS.find((m) => m.key === key);
  if (!layer) return String(value);
  if (layer.unit === "$") return formatCurrency(value);
  if (layer.unit === "%") return formatPercent(value, 1);
  if (layer.unit === "days") return `${Math.round(value)}d`;
  if (layer.unit === "$/sqft") return `$${value}`;
  if (layer.unit === "0–100") return `${Math.round(value)}`;
  return value.toFixed(1);
}

export function CinematicDiscovery({ geoJson }: CinematicDiscoveryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialFitRef = useRef(true);
  const savedOverviewCameraRef = useRef<MapCameraTarget | null>(null);
  const prevSandboxDrillRef = useRef(false);
  const prevDiscoveryFlyoverRef = useRef(false);
  const [exitRestoreTarget, setExitRestoreTarget] = useState<MapCameraTarget | null>(null);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricLayerKey>("medianHomeValue");
  const [activeSection, setActiveSection] = useState<CinematicSection>("metro");
  const [geography, setGeography] = useState<GeographyLevel>("state");
  const [exploreMode, setExploreMode] = useState(false);
  const [sandboxDrillActive, setSandboxDrillActive] = useState(false);
  const [storyCameraActive, setStoryCameraActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [usInsetRegion, setUsInsetRegion] = useState<UsInsetRegion>("continental");
  const [activeSandboxCbsa, setActiveSandboxCbsa] = useState(DC_METRO_CBSA);
  const [searchFlyTarget, setSearchFlyTarget] = useState<[number, number] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [discoveryShellActive, setDiscoveryShellActive] = useState(false);
  const [comparePins, setComparePins] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadDiscoveryFavorites());
  const [discoveryCriteria, setDiscoveryCriteria] = useState<DiscoveryCriteria>(() =>
    loadDiscoveryCriteria(),
  );
  const [discoveryFlyover, setDiscoveryFlyover] = useState<DiscoveryFlyoverState | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<RankedNeighborhood[] | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [discoveryTourComplete, setDiscoveryTourComplete] = useState(false);
  const [pathTraceProgress, setPathTraceProgress] = useState(0);
  const pathTraceRafRef = useRef<number | null>(null);
  const prevFlyoverRef = useRef(false);

  const discoveryFlyoverActive = discoveryFlyover !== null;

  const isOverviewMode = isOverviewGeography(geography) && !sandboxDrillActive;

  const dcStoryActive =
    sandboxDrillActive &&
    storyCameraActive &&
    !exploreMode &&
    !discoveryFlyoverActive &&
    activeSandboxCbsa === DC_METRO_CBSA &&
    geography !== "zip";

  const cinematicTourActive = dcStoryActive || discoveryFlyoverActive;

  const showCinematicEntry =
    sandboxDrillActive &&
    !isOverviewMode &&
    !discoveryFlyoverActive &&
    !dcStoryActive &&
    !discoveryTourComplete &&
    !exploreMode;

  const labelHighlightZip = useMemo((): string | null => {
    if (!cinematicTourActive || isOverviewMode) return null;
    if (discoveryFlyover) {
      return discoveryFlyover.results[discoveryFlyover.index]?.zip ?? null;
    }
    if (dcStoryActive && activeSection !== "metro") {
      return selectedZip;
    }
    return null;
  }, [
    cinematicTourActive,
    isOverviewMode,
    discoveryFlyover,
    dcStoryActive,
    activeSection,
    selectedZip,
  ]);

  const enable3DTiles = is3DTilesActive();
  const use3DCameraPath = is3DTilesFlagEnabled() && dcStoryActive;
  const tilesStatus = getGoogle3DTilesStatus();
  const photoHeroEnabled = isPhotoHeroEnabled();

  const activeShardGeoJson = useMemo(
    () => loadMetroShard(activeSandboxCbsa) ?? geoJson,
    [activeSandboxCbsa, geoJson],
  );

  const sandboxDiscoveryCriteria = useMemo(
    () => discoveryCriteriaForSandbox(activeSandboxCbsa),
    [activeSandboxCbsa],
  );

  const overviewGeoJson = useMemo(() => {
    if (geography === "national") {
      return buildNationalChoroplethFromMetros(US_METROS_GEOJSON, activeMetric);
    }
    if (geography === "state") {
      return buildStateChoroplethFromMetros(US_METROS_GEOJSON, activeMetric);
    }
    if (geography === "county") {
      return buildCountyChoropleth(US_METROS_GEOJSON, SANDBOX_SHARDS_GEOJSON, activeMetric);
    }
    return US_METROS_GEOJSON;
  }, [geography, activeMetric]);

  const activeGeoJson = useMemo(
    () => (isOverviewMode ? overviewGeoJson : activeShardGeoJson),
    [isOverviewMode, overviewGeoJson, activeShardGeoJson],
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
      return `${activeShardGeoJson.metadata.metro} · start a guided tour below`;
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
      setDiscoveryFlyover(null);
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
    setDiscoveryFlyover(null);
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
        const countyCbsa = sandboxCbsaForCounty(regionId);
        if (countyCbsa) {
          setActiveSandboxCbsa(countyCbsa);
          setSandboxDrillActive(true);
          setStoryCameraActive(false);
          setSelectedZip(null);
          setSelectedPropertyId(null);
          setUsInsetRegion("continental");
          return;
        }

        if (
          regionId === DC_METRO_CBSA ||
          regionId === ORLANDO_METRO_CBSA ||
          regionId === SF_METRO_CBSA ||
          regionId === SAN_JOSE_METRO_CBSA
        ) {
          setActiveSandboxCbsa(regionId);
          setSandboxDrillActive(true);
          setStoryCameraActive(false);
          setSelectedZip(null);
          setSelectedPropertyId(null);
          setUsInsetRegion("continental");
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
          setStoryCameraActive(false);
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

  const handleBackgroundClick = useCallback(() => {
    if (exploreMode || isOverviewMode) return;

    const restore = buildBackgroundClickRestore({
      isOverviewMode,
      sandboxDrillActive,
      storyCameraActive,
      selectedZip,
      geography,
      discoveryFlyoverActive,
      activeSandboxCbsa,
      sandboxCameras: SANDBOX_METRO_CAMERAS,
      savedOverviewCamera: savedOverviewCameraRef.current,
      usInsetRegion,
    });

    if (discoveryFlyoverActive) {
      setDiscoveryFlyover(null);
      setDiscoveryTourComplete(true);
    }

    if (selectedZip || geography === "zip") {
      setSelectedZip(null);
      setSelectedPropertyId(null);
      setGeography("metro");
    }

    if (storyCameraActive || discoveryFlyoverActive) {
      setStoryCameraActive(false);
    }

    if (restore) {
      setExitRestoreTarget(restore);
    }
  }, [
    exploreMode,
    isOverviewMode,
    sandboxDrillActive,
    storyCameraActive,
    selectedZip,
    geography,
    discoveryFlyoverActive,
    activeSandboxCbsa,
    usInsetRegion,
  ]);

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
    const centroid = centroidFromGeoJsonGeometry(f.geometry);
    if (centroid && isFiniteLngLat(centroid)) return centroid;
    const { labelLng, labelLat } = f.properties;
    if (isFiniteLngLat([labelLng, labelLat])) {
      return [labelLng, labelLat];
    }
    return null;
  }, [activeShardGeoJson, selectedZip]);

  const cameraTarget = useMemo(() => {
    if (exploreMode) return null;

    if (exitRestoreTarget && isValidCameraTarget(exitRestoreTarget)) {
      return exitRestoreTarget;
    }

    if (discoveryFlyover) {
      const current = discoveryFlyover.results[discoveryFlyover.index];
      if (current && isFiniteLngLat(current.center)) {
        return discoveryFlyoverCamera(current.center);
      }
    }

    if (searchFlyTarget && isFiniteLngLat(searchFlyTarget)) {
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
      geography !== "zip"
    ) {
      const sandboxCamera = SANDBOX_METRO_CAMERAS[activeSandboxCbsa];
      if (sandboxCamera) return sandboxCamera;
    }

    return resolveMapCamera({
      geography,
      zipCenter,
      exploreMode,
      cinematicSection: activeSection,
      sandboxCinematicActive: storyCameraActive && sandboxDrillActive,
      dcStoryActive,
      scrollProgress: dcStoryActive ? scrollProgress : null,
      use3DCameraPath,
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
    exitRestoreTarget,
    use3DCameraPath,
  ]);

  const pathVisible =
    (dcStoryActive &&
      (activeSection === "neighborhood" ||
        activeSection === "detail" ||
        scrollProgress > 0.35)) ||
    (discoveryFlyoverActive &&
      (discoveryFlyover.phase === "flying" || discoveryFlyover.phase === "highlight"));

  const pathFilterZip = discoveryFlyoverActive
    ? (discoveryFlyover.results[discoveryFlyover.index]?.zip ?? null)
    : dcStoryActive
      ? "22201"
      : null;

  const amenityHighlightZip =
    discoveryFlyoverActive && discoveryFlyover.phase === "highlight"
      ? (discoveryFlyover.results[discoveryFlyover.index]?.zip ?? null)
      : null;

  const discoveryShellVisible =
    discoveryShellActive && sandboxDrillActive && !isOverviewMode;

  const comparePinnedNeighborhoods = useMemo(() => {
    if (!discoveryResults) return [];
    return comparePins
      .map((zip) => discoveryResults.find((r) => r.zip === zip))
      .filter((r): r is RankedNeighborhood => r !== undefined);
  }, [comparePins, discoveryResults]);

  const showMetricSidebar = !discoveryShellVisible;

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

  const handleOpenCriteria = useCallback(() => {
    if (isOverviewMode || !SANDBOX_CBSA.has(activeSandboxCbsa)) {
      setDiscoveryMessage("Open a sandbox metro (DC, Orlando, SF Bay, or San Jose) first");
      return;
    }
    setDiscoveryMessage(null);
    setDiscoveryShellActive(true);
  }, [isOverviewMode, activeSandboxCbsa]);

  const handleToggleFavorite = useCallback((zip: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(zip)) next.delete(zip);
      else next.add(zip);
      saveDiscoveryFavorites(next);
      return next;
    });
  }, []);

  const handleMatchSelect = useCallback(
    (zip: string) => {
      handleZipSelect(zip);
      setDrawerOpen(true);
    },
    [handleZipSelect],
  );

  const handleRemoveComparePin = useCallback((zip: string) => {
    setComparePins((prev) => prev.filter((z) => z !== zip));
  }, []);

  const runDiscoveryRanking = useCallback(() => {
    setDiscoveryMessage(null);
    setDiscoveryTourComplete(false);
    prevFlyoverRef.current = false;

    if (isOverviewMode || !SANDBOX_CBSA.has(activeSandboxCbsa)) {
      setDiscoveryMessage("Open a sandbox metro (DC, Orlando, SF Bay, or San Jose) first");
      return;
    }

    setStoryCameraActive(false);
    setSearchFlyTarget(null);
    setDiscoveryShellActive(true);

    const results = rankNeighborhoods(activeShardGeoJson, discoveryCriteria, 0);

    if (results.length === 0) {
      setDiscoveryResults([]);
      setDiscoveryMessage("No neighborhoods in this sandbox");
      return;
    }

    setDiscoveryResults(results);
    setComparePins(results.slice(0, 3).map((r) => r.zip));
    setSandboxDrillActive(true);
    setGeography("zip");
    setSelectedZip(results[0].zip);
  }, [isOverviewMode, activeSandboxCbsa, activeShardGeoJson, discoveryCriteria]);

  const handleDiscover = useCallback(() => {
    runDiscoveryRanking();
  }, [runDiscoveryRanking]);

  const handleStartFlyoverTour = useCallback(() => {
    if (!discoveryResults || discoveryResults.length === 0) {
      runDiscoveryRanking();
      return;
    }

    const top3 = discoveryResults.slice(0, 3);
    setDiscoveryTourComplete(false);
    setSelectedZip(top3[0].zip);
    setDiscoveryFlyover({ results: top3, index: 0, phase: "flying" });
  }, [discoveryResults, runDiscoveryRanking]);

  const handleSkipFlyover = useCallback(() => {
    setDiscoveryFlyover(null);
    setDiscoveryTourComplete(true);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    const wasSandbox = prevSandboxDrillRef.current;
    const wasDiscovery = prevDiscoveryFlyoverRef.current;
    prevSandboxDrillRef.current = sandboxDrillActive;
    prevDiscoveryFlyoverRef.current = discoveryFlyoverActive;

    if (wasSandbox && !sandboxDrillActive && isOverviewGeography(geography)) {
      setExitRestoreTarget(
        buildOverviewRestoreCamera(savedOverviewCameraRef.current, usInsetRegion),
      );
      return;
    }

    if (wasDiscovery && !discoveryFlyoverActive && sandboxDrillActive) {
      setExitRestoreTarget(
        buildSandboxFlatRestore(activeSandboxCbsa, SANDBOX_METRO_CAMERAS),
      );
    }
  }, [
    sandboxDrillActive,
    discoveryFlyoverActive,
    geography,
    activeSandboxCbsa,
    usInsetRegion,
  ]);

  useEffect(() => {
    if (!exitRestoreTarget) return;
    const timer = window.setTimeout(
      () => setExitRestoreTarget(null),
      (exitRestoreTarget.duration ?? 1200) + 100,
    );
    return () => window.clearTimeout(timer);
  }, [exitRestoreTarget]);

  const handleOverviewCameraCapture = useCallback((camera: MapCameraTarget) => {
    if (!isValidCameraTarget(camera)) return;
    savedOverviewCameraRef.current = sanitizeCameraTarget(camera);
  }, []);

  useEffect(() => {
    if (!discoveryFlyoverActive) {
      setPathTraceProgress(0);
      return;
    }

    if (discoveryFlyover?.phase === "highlight") {
      setPathTraceProgress(1);
      return;
    }

    const start = performance.now();
    const duration = FLYOVER_CAMERA_MS;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setPathTraceProgress(t);
      if (t < 1) {
        pathTraceRafRef.current = requestAnimationFrame(tick);
      }
    };

    pathTraceRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (pathTraceRafRef.current !== null) {
        cancelAnimationFrame(pathTraceRafRef.current);
        pathTraceRafRef.current = null;
      }
    };
  }, [discoveryFlyoverActive, discoveryFlyover?.index, discoveryFlyover?.phase]);

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
        if (nextIndex >= prev.results.length) {
          setGeography("metro");
          setSelectedZip(null);
          return null;
        }
        setSelectedZip(prev.results[nextIndex].zip);
        return { ...prev, index: nextIndex, phase: "flying" };
      });
    }, FLYOVER_HIGHLIGHT_MS);

    return () => window.clearTimeout(timer);
  }, [discoveryFlyover]);

  useEffect(() => {
    if (discoveryFlyover?.phase === "highlight") {
      setDrawerOpen(true);
    }
  }, [discoveryFlyover?.index, discoveryFlyover?.phase]);

  useEffect(() => {
    if (prevFlyoverRef.current && !discoveryFlyover && discoveryResults && discoveryResults.length > 0) {
      setDiscoveryTourComplete(true);
      setDrawerOpen(true);
    }
    prevFlyoverRef.current = discoveryFlyover !== null;
  }, [discoveryFlyover, discoveryResults]);

  const activeDiscoveryNeighborhood = useMemo((): RankedNeighborhood | null => {
    if (!discoveryResults || discoveryResults.length === 0) return null;
    if (discoveryFlyover) {
      return discoveryFlyover.results[discoveryFlyover.index] ?? null;
    }
    if (discoveryTourComplete && selectedZip) {
      return discoveryResults.find((r) => r.zip === selectedZip) ?? discoveryResults[0];
    }
    return null;
  }, [discoveryFlyover, discoveryResults, discoveryTourComplete, selectedZip]);

  const showAnalyticsOverlay =
    activeDiscoveryNeighborhood !== null &&
    (discoveryFlyover?.phase === "highlight" || discoveryTourComplete);

  const photoHeroZip = useMemo((): string | null => {
    if (discoveryFlyover) {
      return discoveryFlyover.results[discoveryFlyover.index]?.zip ?? null;
    }
    if (discoveryTourComplete && activeDiscoveryNeighborhood) {
      return activeDiscoveryNeighborhood.zip;
    }
    if (dcStoryActive && activeSection === "detail" && selectedZip) {
      return selectedZip;
    }
    return null;
  }, [discoveryFlyover, discoveryTourComplete, activeDiscoveryNeighborhood, dcStoryActive, activeSection, selectedZip]);

  const photoHeroVisible =
    photoHeroEnabled &&
    photoHeroZip !== null &&
    ((discoveryFlyover?.phase === "highlight") ||
      (discoveryTourComplete && !discoveryFlyover) ||
      (dcStoryActive && activeSection === "detail"));

  const neighborhoodPhoto = photoHeroZip ? getNeighborhoodPhoto(photoHeroZip) : null;

  const metroDescription = showCinematicEntry
    ? "Start a guided tour of top-ranked neighborhoods, or enter Story mode for a scroll-driven DC descent."
    : !storyCameraActive && sandboxDrillActive
      ? "Story camera paused while you explore. Use the banner below to restart a tour or story."
      : SCROLL_SECTIONS[0].description;

  const overviewFeatureCount = activeGeoJson.features.filter(
    (f) => f.properties.medianHomeValue > 0,
  ).length;

  const activeScrollSection = SCROLL_SECTIONS.find((s) => s.id === activeSection);

  const contextChip = useMemo(() => {
    if (discoveryFlyover) {
      const current = discoveryFlyover.results[discoveryFlyover.index];
      const phaseLabel =
        discoveryFlyover.phase === "flying" ? "Flying in…" : "Neighborhood analytics";
      const { metrics: m } = current;
      return {
        stepLabel: `${discoveryFlyover.index + 1} / ${discoveryFlyover.results.length}`,
        title: `#${current.rank} · ${current.zip} — ${current.name}`,
        detail: `${phaseLabel} · ${current.matchPercent}% match · forecast ${formatPercent(m.homePriceForecast1yr)} · cap ${formatPercent(m.capRate)} · walk ${Math.round(m.walkabilityScore)}`,
        canOpen: true,
        action: { label: "Skip tour", onClick: handleSkipFlyover },
      };
    }

    if (discoveryTourComplete && activeDiscoveryNeighborhood) {
      const { metrics: m } = activeDiscoveryNeighborhood;
      return {
        stepLabel: "Tour complete",
        title: `#${activeDiscoveryNeighborhood.rank} · ${activeDiscoveryNeighborhood.zip} — ${activeDiscoveryNeighborhood.name}`,
        detail: `${activeDiscoveryNeighborhood.matchPercent}% match · forecast ${formatPercent(m.homePriceForecast1yr)} · PSF $${Math.round(m.marketPsf)}/sqft`,
        canOpen: true,
        action: { label: "Your criteria", onClick: handleOpenCriteria },
      };
    }

    if (discoveryMessage) {
      return {
        stepLabel: "Discovery",
        title: discoveryMessage,
        detail: "Adjust criteria or drill into a sandbox metro (DC, Orlando, SF Bay, San Jose)",
        canOpen: true,
        action: { label: "Your criteria", onClick: handleOpenCriteria },
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
      };
    }

    if (selected && selectedFeature) {
      const metricLabel =
        METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? activeMetric;
      const metricValue = getRawMetricFromFeature(selectedFeature, activeMetric);
      return {
        stepLabel: "ZIP",
        title: `${selected.zip} — ${selected.name}`,
        detail: `${metricLabel}: ${formatActiveMetricValue(activeMetric, metricValue)}`,
        canOpen: true,
      };
    }

    return {
      stepLabel: "Sandbox",
      title: activeShardGeoJson.metadata.metro,
      detail: showCinematicEntry
        ? "Guided tour & story mode available"
        : storyCameraActive
          ? "Guided story · scroll to explore"
          : "Flat view",
      canOpen: true,
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
    selectedFeature,
    activeMetric,
    activeShardGeoJson.metadata.metro,
    activeSandboxCbsa,
    showCinematicEntry,
    discoveryFlyover,
    discoveryMessage,
    handleSkipFlyover,
    handleOpenCriteria,
    discoveryShellVisible,
    discoveryTourComplete,
    activeDiscoveryNeighborhood,
  ]);

  const drawerContent = useMemo(() => {
    if (activeDiscoveryNeighborhood && (discoveryFlyover || discoveryTourComplete)) {
      return (
        <>
          <DiscoveryAnalyticsPanel
            neighborhood={activeDiscoveryNeighborhood}
            metroAvgPsf={metroAvgPsf}
            variant="drawer"
          />
          {discoveryResults && discoveryResults.length > 1 && (
            <div className="discovery-results discovery-results--tour-nav" role="group" aria-label="Tour stops">
              {discoveryResults.map((r) => (
                <button
                  key={r.zip}
                  type="button"
                  className={`zip-chip${selectedZip === r.zip ? " zip-chip--active" : ""}`}
                  onClick={() => handleZipSelect(r.zip)}
                >
                  #{r.rank} {r.zip}
                </button>
              ))}
            </div>
          )}
        </>
      );
    }

    if (discoveryResults && discoveryResults.length > 0) {
      return (
        <>
          <p>Top matches by criteria match % (partial matches included).</p>
          <ol className="discovery-results">
            {discoveryResults.map((r) => (
              <li key={r.zip} className="discovery-results__item">
                <button type="button" onClick={() => handleZipSelect(r.zip)}>
                  <strong>
                    #{r.rank} {r.zip} — {r.name}
                  </strong>
                  {!r.passedFilters && (
                    <span className="discovery-results__partial"> · partial match</span>
                  )}
                </button>
                <span className="discovery-results__score">{r.matchPercent}% match</span>
                <ul className="discovery-results__breakdown">
                  {Object.entries(r.breakdown.byMetric).map(([metric, score]) => (
                    <li key={metric}>
                      {getDiscoveryMetricLabel(metric as DiscoveryFilterMetric)}:{" "}
                      {score?.toFixed(0)}%
                    </li>
                  ))}
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
            Click Washington-Arlington-Alexandria, Orlando, SF Bay, or San Jose to open ZIP sandbox detail.
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
            mapCenter={zipCenter}
          />
        </>
      );
    }

    const section = activeScrollSection ?? SCROLL_SECTIONS[0];
    return (
      <>
        <p>{section.id === "metro" ? metroDescription : section.description}</p>
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
    activeDiscoveryNeighborhood,
    discoveryFlyover,
    discoveryTourComplete,
    zipCenter,
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
        onOpenCriteria={handleOpenCriteria}
        onDiscover={discoveryShellVisible ? handleDiscover : handleStartFlyoverTour}
        discoverDisabled={discoveryFlyoverActive}
        discoverLabel={
          discoveryFlyoverActive
            ? "Tour in progress…"
            : discoveryShellVisible
              ? "Find matches"
              : "Tour top neighborhoods"
        }
      />

      <div
        className={`cinematic${exploreMode ? " cinematic--explore" : ""}${isOverviewMode ? " cinematic--national" : ""}${cinematicTourActive ? " cinematic--tour" : ""}${discoveryShellVisible ? " cinematic--discovery" : ""}`}
      >
        {showMetricSidebar && (
          <aside className="cinematic__sidebar">
            <Sidebar
              activeMetric={activeMetric}
              onMetricChange={setActiveMetric}
              mode={sidebarMode}
              selectedZip={selectedZip}
              zips={zips}
            />
          </aside>
        )}

        {discoveryShellVisible && (
          <CriteriaPanel
            criteria={discoveryCriteria}
            resetCriteria={sandboxDiscoveryCriteria}
            geoJson={activeShardGeoJson}
            onChange={handleApplyCriteria}
            onFindMatches={handleDiscover}
          />
        )}

        {discoveryShellVisible && discoveryResults && discoveryResults.length > 0 && (
          <MatchesList
            results={discoveryResults}
            selectedZip={selectedZip}
            favorites={favorites}
            onSelect={handleMatchSelect}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <div className="cinematic__map">
          {discoveryShellVisible && comparePinnedNeighborhoods.length > 0 && (
            <CompareChips
              pinned={comparePinnedNeighborhoods}
              activeZip={selectedZip}
              onSelect={handleMatchSelect}
              onRemove={handleRemoveComparePin}
            />
          )}
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
            onBackgroundClick={handleBackgroundClick}
            cameraTarget={cameraTarget}
            cameraInstant={dcStoryActive}
            pathVisible={pathVisible}
            pathTraceProgress={discoveryFlyoverActive ? pathTraceProgress : 1}
            pathFilterZip={pathFilterZip}
            amenityHighlightZip={amenityHighlightZip}
            enable3DTiles={enable3DTiles}
            selectionBorderVisible={!discoveryFlyoverActive}
            exploreMode={exploreMode}
            onToggleExploreMode={handleToggleExplore}
            onUserMapMove={handleUserMapMove}
            onOverviewCameraCapture={handleOverviewCameraCapture}
            mapBounds={mapBounds}
            geographyLevel={geography}
            overviewMode={isOverviewMode}
            fitNationalBounds={fitNationalBounds}
            cinematicOnSelect={!isOverviewMode}
            cinematicTourActive={cinematicTourActive}
            labelHighlightZip={labelHighlightZip}
          />
          {showCinematicEntry && (
            <CinematicEntryBar
              metroName={activeShardGeoJson.metadata.metro}
              showStoryMode={activeSandboxCbsa === DC_METRO_CBSA}
              onTourTopNeighborhoods={handleStartFlyoverTour}
              onStoryMode={
                activeSandboxCbsa === DC_METRO_CBSA ? handleResumeDcStory : undefined
              }
            />
          )}
          {isOverviewMode && geography === "national" && !exploreMode && (
            <UsMapInsets activeRegion={usInsetRegion} onSelectRegion={handleInsetSelect} />
          )}
          {photoHeroEnabled && (
            <NeighborhoodPhotoHero
              photo={neighborhoodPhoto}
              visible={photoHeroVisible}
              zip={photoHeroZip ?? undefined}
              neighborhood={activeDiscoveryNeighborhood?.name}
            />
          )}
          <Google3DTilesBadge status={tilesStatus} />
          {showAnalyticsOverlay && activeDiscoveryNeighborhood && (
            <AnalyticsOverlay
              neighborhood={activeDiscoveryNeighborhood}
              metroAvgPsf={metroAvgPsf}
              phaseLabel={
                discoveryTourComplete && !discoveryFlyover
                  ? "Tour complete — neighborhood analytics"
                  : "Neighborhood analytics"
              }
              animateIn={discoveryFlyover?.phase === "highlight" || discoveryTourComplete}
              onOpenDetails={() => setDrawerOpen(true)}
            />
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
    </>
  );
}
