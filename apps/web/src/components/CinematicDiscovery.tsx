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
  applySimilarityScores,
  MAX_EXAMPLE_ZIPS,
  type DiscoveryCriteria,
  type DiscoveryFilterMetric,
  type RankedNeighborhood,
  discoveryCriteriaForSandbox,
  getDiscoveryMetricLabel,
  getRawMetricFromFeature,
  getCriteriaChoroplethMetric,
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
import { DiscoveryDeepDivePanel } from "./DiscoveryDeepDivePanel";
import { NeighborhoodPhotoHero } from "./NeighborhoodPhotoHero";
import { CinematicEntryBar } from "./CinematicEntryBar";
import { CinematicTourDeck } from "./CinematicTourDeck";
import { ExploreCityBar } from "./ExploreCityBar";
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
import {
  loadDiscoveryExamples,
  saveDiscoveryExamples,
} from "@/lib/discovery-examples-storage";

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
  metro: "All metros · green outline = ingested · click to select",
  county: "County view · national counties · click sandbox county to drill in",
};

const SANDBOX_CBSA = new Set([DC_METRO_CBSA, ORLANDO_METRO_CBSA, SF_METRO_CBSA, SAN_JOSE_METRO_CBSA]);

function isDiscoveryMetro(cbsa: string, ingested: ReadonlySet<string>): boolean {
  return SANDBOX_CBSA.has(cbsa) || ingested.has(cbsa);
}

function resolveSelectedDiscoveryCbsa(
  sandboxDrillActive: boolean,
  activeSandboxCbsa: string,
  selectedOverviewMetro: string | null,
  ingestedCbsas: ReadonlySet<string>,
): string | null {
  if (sandboxDrillActive && isDiscoveryMetro(activeSandboxCbsa, ingestedCbsas)) {
    return activeSandboxCbsa;
  }
  if (selectedOverviewMetro && isDiscoveryMetro(selectedOverviewMetro, ingestedCbsas)) {
    return selectedOverviewMetro;
  }
  return null;
}

function metroOverviewCamera(cbsa: string): MapCameraTarget | null {
  const feature = US_METROS_GEOJSON.features.find((f) => f.properties.zipCode === cbsa);
  if (!feature) return null;
  const { labelLng, labelLat } = feature.properties;
  if (!isFiniteLngLat([labelLng, labelLat])) return null;
  return {
    center: [labelLng, labelLat],
    zoom: 8.5,
    pitch: 0,
    bearing: 0,
    duration: 900,
  };
}

function metroCameraFromShard(shard: DcMetroGeoJson): MapCameraTarget {
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  for (const feature of shard.features) {
    const centroid = centroidFromGeoJsonGeometry(feature.geometry);
    if (centroid && isFiniteLngLat(centroid)) {
      sumLng += centroid[0];
      sumLat += centroid[1];
      count++;
    }
  }
  if (count === 0) {
    return { center: [-96.5, 39.2], zoom: 10, pitch: 0, bearing: 0, duration: 800 };
  }
  return {
    center: [sumLng / count, sumLat / count],
    zoom: 10,
    pitch: 0,
    bearing: 0,
    duration: 800,
  };
}

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
  const [criteriaPanelOpen, setCriteriaPanelOpen] = useState(false);
  const criteriaPanelRef = useRef<HTMLElement>(null);
  const [comparePins, setComparePins] = useState<string[]>([]);
  const [comparePinOfferZip, setComparePinOfferZip] = useState<string | null>(null);
  const [exampleZips, setExampleZips] = useState<string[]>(() => loadDiscoveryExamples());
  const [favorites, setFavorites] = useState<Set<string>>(() => loadDiscoveryFavorites());
  const [discoveryCriteria, setDiscoveryCriteria] = useState<DiscoveryCriteria>(() =>
    loadDiscoveryCriteria(),
  );
  const [discoveryFlyover, setDiscoveryFlyover] = useState<DiscoveryFlyoverState | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<RankedNeighborhood[] | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [discoveryTourComplete, setDiscoveryTourComplete] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [pathTraceProgress, setPathTraceProgress] = useState(0);
  const pathTraceRafRef = useRef<number | null>(null);
  const prevFlyoverRef = useRef(false);
  const [loadedShards, setLoadedShards] = useState<Record<string, DcMetroGeoJson>>({});
  const [ingestedCbsas, setIngestedCbsas] = useState<Set<string>>(new Set());
  const [metroCameras, setMetroCameras] = useState<Record<string, MapCameraTarget>>({});
  const [selectedOverviewMetro, setSelectedOverviewMetro] = useState<string | null>(null);
  const [selectedMetroCamera, setSelectedMetroCamera] = useState<MapCameraTarget | null>(null);
  const [exploreCityLoading, setExploreCityLoading] = useState(false);
  const loadingShardsRef = useRef<Set<string>>(new Set());
  const discoveryActivatedRef = useRef<string | null>(null);

  const discoveryFlyoverActive = discoveryFlyover !== null;

  const ensureMetroShard = useCallback(
    async (cbsaCode: string): Promise<DcMetroGeoJson | undefined> => {
      const bundled = loadMetroShard(cbsaCode);
      if (bundled) return bundled;
      if (loadedShards[cbsaCode]) return loadedShards[cbsaCode];
      if (loadingShardsRef.current.has(cbsaCode)) return undefined;

      loadingShardsRef.current.add(cbsaCode);
      try {
        const shard = await fetchMetroShard(cbsaCode, {
          apiBaseUrl: process.env.NEXT_PUBLIC_METRO_API_BASE_URL,
        });
        if (!shard) return undefined;
        setLoadedShards((prev) => ({ ...prev, [cbsaCode]: shard }));
        setMetroCameras((prev) => ({
          ...prev,
          [cbsaCode]: metroCameraFromShard(shard),
        }));
        return shard;
      } finally {
        loadingShardsRef.current.delete(cbsaCode);
      }
    },
    [loadedShards],
  );

  useEffect(() => {
    void fetch("/api/v1/metros/ingested")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { cbsaCodes?: string[] } | null) => {
        if (data?.cbsaCodes) {
          setIngestedCbsas(new Set(data.cbsaCodes));
        }
      })
      .catch(() => {
        // Ingest list unavailable — sandbox metros still work
      });
  }, []);

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
    discoveryShellActive &&
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
    () =>
      loadMetroShard(activeSandboxCbsa) ??
      loadedShards[activeSandboxCbsa] ??
      geoJson,
    [activeSandboxCbsa, geoJson, loadedShards],
  );

  const activeShardReady = useMemo(() => {
    if (SANDBOX_CBSA.has(activeSandboxCbsa)) return true;
    return Boolean(loadMetroShard(activeSandboxCbsa) ?? loadedShards[activeSandboxCbsa]);
  }, [activeSandboxCbsa, loadedShards]);

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

  const mergedMetroCameras = useMemo(
    () => ({ ...SANDBOX_METRO_CAMERAS, ...metroCameras }),
    [metroCameras],
  );

  const selectedOverviewMetroFeature = useMemo(() => {
    if (!selectedOverviewMetro) return null;
    return (
      US_METROS_GEOJSON.features.find(
        (f) => f.properties.zipCode === selectedOverviewMetro,
      ) ?? null
    );
  }, [selectedOverviewMetro]);

  const showExploreCityBar =
    isOverviewMode &&
    selectedOverviewMetro !== null &&
    !SANDBOX_CBSA.has(selectedOverviewMetro) &&
    ingestedCbsas.has(selectedOverviewMetro);

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
    setSelectedOverviewMetro(null);
    setSelectedMetroCamera(null);

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
    setSelectedOverviewMetro(null);
    setSelectedMetroCamera(null);
  }, []);

  const handleExploreCity = useCallback(() => {
    if (!selectedOverviewMetro) return;

    setExploreCityLoading(true);
    void ensureMetroShard(selectedOverviewMetro)
      .then((shard) => {
        if (!shard) return;
        setActiveSandboxCbsa(selectedOverviewMetro);
        setSandboxDrillActive(true);
        setStoryCameraActive(false);
        setSelectedZip(null);
        setSelectedPropertyId(null);
        setSelectedOverviewMetro(null);
        setSelectedMetroCamera(null);
        setSearchFlyTarget(null);
        setGeography("metro");
      })
      .finally(() => {
        setExploreCityLoading(false);
      });
  }, [selectedOverviewMetro, ensureMetroShard]);

  const handleDismissExploreCity = useCallback(() => {
    setSelectedOverviewMetro(null);
    setSelectedMetroCamera(null);
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
      setExitRestoreTarget(null);

      if (isOverviewMode) {
        const countyCbsa = sandboxCbsaForCounty(regionId);
        if (countyCbsa) {
          setSelectedOverviewMetro(null);
          setSelectedMetroCamera(null);
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
          setSelectedOverviewMetro(null);
          setSelectedMetroCamera(null);
          setActiveSandboxCbsa(regionId);
          setSandboxDrillActive(true);
          setStoryCameraActive(false);
          setSelectedZip(null);
          setSelectedPropertyId(null);
          setUsInsetRegion("continental");
          return;
        }

        if (ingestedCbsas.has(regionId)) {
          setSelectedOverviewMetro(regionId);
          setSelectedMetroCamera(metroOverviewCamera(regionId));
          return;
        }

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
    [isOverviewMode, sandboxDrillActive, ingestedCbsas],
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

      if (ingestedCbsas.has(result.id)) {
        setGeography("metro");
        setSandboxDrillActive(false);
        setStoryCameraActive(false);
        setSelectedZip(null);
        setSelectedPropertyId(null);
        setSelectedOverviewMetro(result.id);
        setSelectedMetroCamera(metroOverviewCamera(result.id));
        setUsInsetRegion("continental");
        return;
      }

      setGeography("metro");
      setSandboxDrillActive(false);
      setStoryCameraActive(false);
      setSelectedZip(null);
      setSelectedPropertyId(null);
      setSearchFlyTarget([result.lng, result.lat]);
    },
    [handleZipSelect, sandboxDrillActive, ingestedCbsas],
  );

  const handleCloseDetail = () => {
    setSelectedZip(null);
    setSelectedPropertyId(null);
  };

  const handleBackgroundClick = useCallback(() => {
    if (isOverviewMode) {
      setSelectedOverviewMetro(null);
      setSelectedMetroCamera(null);
      return;
    }
    if (exploreMode) return;

    const restore = buildBackgroundClickRestore({
      isOverviewMode,
      sandboxDrillActive,
      storyCameraActive,
      selectedZip,
      geography,
      discoveryFlyoverActive,
      activeSandboxCbsa,
      sandboxCameras: mergedMetroCameras,
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
      setDeepDiveOpen(false);
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
    mergedMetroCameras,
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

  const discoveryShellVisible =
    discoveryShellActive && sandboxDrillActive && !isOverviewMode;

  const criteriaPanelVisible = criteriaPanelOpen;
  const criteriaGeographyRestricted = criteriaPanelOpen || discoveryShellVisible;

  const selectedDiscoveryCbsa = useMemo(
    () =>
      resolveSelectedDiscoveryCbsa(
        sandboxDrillActive,
        activeSandboxCbsa,
        selectedOverviewMetro,
        ingestedCbsas,
      ),
    [sandboxDrillActive, activeSandboxCbsa, selectedOverviewMetro, ingestedCbsas],
  );

  const criteriaNeedsMetroSelection = criteriaPanelVisible && selectedDiscoveryCbsa === null;

  const deepDiveNeighborhood = useMemo((): RankedNeighborhood | null => {
    if (!deepDiveOpen || !selectedZip || !discoveryResults) return null;
    return discoveryResults.find((r) => r.zip === selectedZip) ?? null;
  }, [deepDiveOpen, selectedZip, discoveryResults]);

  const cameraTarget = useMemo(() => {
    if (exploreMode) return null;

    if (exitRestoreTarget && isValidCameraTarget(exitRestoreTarget)) {
      return exitRestoreTarget;
    }

    if (discoveryShellVisible && !discoveryFlyoverActive && selectedZip && discoveryResults) {
      const match = discoveryResults.find((r) => r.zip === selectedZip);
      if (match && isFiniteLngLat(match.center)) {
        return discoveryFlyoverCamera(match.center);
      }
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

    if (
      selectedMetroCamera &&
      isValidCameraTarget(selectedMetroCamera) &&
      isOverviewMode
    ) {
      return selectedMetroCamera;
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
      const sandboxCamera =
        SANDBOX_METRO_CAMERAS[activeSandboxCbsa] ?? metroCameras[activeSandboxCbsa];
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
    discoveryShellVisible,
    discoveryResults,
    selectedZip,
    metroCameras,
    selectedMetroCamera,
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

  const comparePinnedNeighborhoods = useMemo(() => {
    if (!discoveryResults) return [];
    return comparePins
      .map((zip) => discoveryResults.find((r) => r.zip === zip))
      .filter((r): r is RankedNeighborhood => r !== undefined);
  }, [comparePins, discoveryResults]);

  const zipLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of activeShardGeoJson.features) {
      map.set(f.properties.zipCode, f.properties.neighborhoodName);
    }
    return map;
  }, [activeShardGeoJson]);

  const comparePinOfferName = comparePinOfferZip ? zipLabelMap.get(comparePinOfferZip) : null;

  const showMetricSidebar = !criteriaPanelVisible;

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
    setDiscoveryResults((prev) => {
      if (prev === null) return prev;
      const ranked = rankNeighborhoods(activeShardGeoJson, criteria, 0);
      return applySimilarityScores(ranked, activeShardGeoJson, exampleZips);
    });
  }, [activeShardGeoJson, exampleZips]);

  const drillIntoDiscoveryMetro = useCallback(
    async (cbsa: string): Promise<DcMetroGeoJson | null> => {
      const shard = await ensureMetroShard(cbsa);
      if (!shard) return null;
      setActiveSandboxCbsa(cbsa);
      setSandboxDrillActive(true);
      setStoryCameraActive(false);
      setSelectedZip(null);
      setSelectedPropertyId(null);
      setSelectedOverviewMetro(null);
      setSelectedMetroCamera(null);
      setSearchFlyTarget(null);
      setGeography("metro");
      return shard;
    },
    [ensureMetroShard],
  );

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
      setExitRestoreTarget(null);
      setSearchFlyTarget(null);
      handleZipSelect(zip);
      if (discoveryShellActive && sandboxDrillActive && !isOverviewMode) {
        setDeepDiveOpen(true);
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true);
      }
    },
    [handleZipSelect, discoveryShellActive, sandboxDrillActive, isOverviewMode],
  );

  const handleDeepDiveBack = useCallback(() => {
    setDeepDiveOpen(false);
    setSelectedZip(null);
    setGeography("metro");
  }, []);

  const handleRemoveComparePin = useCallback((zip: string) => {
    setComparePins((prev) => prev.filter((z) => z !== zip));
    setComparePinOfferZip((prev) => (prev === zip ? null : prev));
  }, []);

  const handleReorderComparePins = useCallback((fromIndex: number, toIndex: number) => {
    setComparePins((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handlePinToCompare = useCallback(
    (zip: string) => {
      if (comparePins.includes(zip)) {
        setComparePinOfferZip(null);
        return;
      }
      if (comparePins.length >= 4) {
        setDiscoveryMessage("Compare bar full — remove a chip to pin another (max 4)");
        return;
      }
      setDiscoveryMessage(null);
      setComparePins((prev) => [...prev, zip]);
      setComparePinOfferZip(null);
    },
    [comparePins],
  );

  const handleMapZipSelect = useCallback(
    (regionId: string | null) => {
      handleZipSelect(regionId);
      if (!regionId || !discoveryShellActive || !sandboxDrillActive || isOverviewMode) {
        setComparePinOfferZip(null);
        return;
      }
      setDeepDiveOpen(true);
      setDrawerOpen(false);
      if (!comparePins.includes(regionId)) {
        setComparePinOfferZip(regionId);
      } else {
        setComparePinOfferZip(null);
      }
    },
    [handleZipSelect, discoveryShellActive, sandboxDrillActive, isOverviewMode, comparePins],
  );

  const handleAddExample = useCallback((zip: string) => {
    setExampleZips((prev) => {
      if (prev.includes(zip) || prev.length >= MAX_EXAMPLE_ZIPS) return prev;
      const next = [...prev, zip];
      saveDiscoveryExamples(next);
      return next;
    });
  }, []);

  const handleRemoveExample = useCallback((zip: string) => {
    setExampleZips((prev) => {
      const next = prev.filter((z) => z !== zip);
      saveDiscoveryExamples(next);
      return next;
    });
  }, []);

  const enterDiscoveryMetro = useCallback(
    (options?: {
      openDeepDive?: boolean;
      markTourComplete?: boolean;
      geoJson?: DcMetroGeoJson;
    }) => {
      setDiscoveryMessage(null);
      setStoryCameraActive(false);
      setSearchFlyTarget(null);
      setExitRestoreTarget(null);
      setDiscoveryShellActive(true);
      setCriteriaPanelOpen(true);

      if (options?.markTourComplete !== false) {
        setDiscoveryTourComplete(true);
      } else {
        setDiscoveryTourComplete(false);
      }

      const shard = options?.geoJson ?? activeShardGeoJson;
      const ranked = rankNeighborhoods(shard, discoveryCriteria, 0);
      const results = applySimilarityScores(ranked, shard, exampleZips);

      if (results.length === 0) {
        setDiscoveryResults([]);
        setDiscoveryMessage("No neighborhoods in this metro");
        setDeepDiveOpen(false);
        return;
      }

      setDiscoveryResults(results);
      setComparePins(results.slice(0, 3).map((r) => r.zip));
      setSandboxDrillActive(true);

      if (options?.openDeepDive === true) {
        setGeography("zip");
        setSelectedZip(results[0].zip);
        setDeepDiveOpen(true);
      } else {
        setGeography("metro");
        setSelectedZip(null);
        setDeepDiveOpen(false);
      }
    },
    [activeShardGeoJson, discoveryCriteria, exampleZips],
  );

  const handleOpenCriteria = useCallback(() => {
    setCriteriaPanelOpen(true);

    const selectedCbsa = resolveSelectedDiscoveryCbsa(
      sandboxDrillActive,
      activeSandboxCbsa,
      selectedOverviewMetro,
      ingestedCbsas,
    );

    if (!selectedCbsa) {
      setDiscoveryMessage("Select a metro on the map to rank neighborhoods");
      return;
    }

    setDiscoveryMessage(null);
    setDiscoveryShellActive(true);

    if (sandboxDrillActive && activeSandboxCbsa === selectedCbsa) {
      if (!discoveryResults) {
        enterDiscoveryMetro({ openDeepDive: false, markTourComplete: false });
      }
      return;
    }

    setExploreCityLoading(true);
    void drillIntoDiscoveryMetro(selectedCbsa)
      .then((shard) => {
        if (!shard) {
          setDiscoveryMessage("Metro data unavailable — try another metro");
          return;
        }
        enterDiscoveryMetro({
          openDeepDive: false,
          markTourComplete: false,
          geoJson: shard,
        });
      })
      .finally(() => {
        setExploreCityLoading(false);
      });
  }, [
    sandboxDrillActive,
    activeSandboxCbsa,
    selectedOverviewMetro,
    ingestedCbsas,
    discoveryResults,
    drillIntoDiscoveryMetro,
    enterDiscoveryMetro,
  ]);

  const handleCriteriaToggle = useCallback(() => {
    if (criteriaPanelOpen) {
      setCriteriaPanelOpen(false);
      return;
    }
    handleOpenCriteria();
  }, [criteriaPanelOpen, handleOpenCriteria]);

  const handleMapOverview = useCallback(() => {
    setCriteriaPanelOpen(false);
  }, []);

  const runDiscoveryRanking = useCallback(() => {
    setDiscoveryMessage(null);
    setDiscoveryTourComplete(false);
    prevFlyoverRef.current = false;

    if (isOverviewMode || !isDiscoveryMetro(activeSandboxCbsa, ingestedCbsas)) {
      setDiscoveryMessage("Select a metro on the map, then Explore city or drill into a sandbox");
      return;
    }

    enterDiscoveryMetro({ openDeepDive: false, markTourComplete: false });
  }, [
    isOverviewMode,
    activeSandboxCbsa,
    ingestedCbsas,
    enterDiscoveryMetro,
  ]);

  useEffect(() => {
    if (!discoveryShellVisible) return;
    const metric = getCriteriaChoroplethMetric(discoveryCriteria);
    if (metric) {
      setActiveMetric(metric);
    }
  }, [discoveryCriteria, discoveryShellVisible]);

  useEffect(() => {
    if (!criteriaPanelVisible) return;
    const frame = requestAnimationFrame(() => {
      criteriaPanelRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [criteriaPanelVisible]);

  useEffect(() => {
    if (!criteriaGeographyRestricted) return;
    if (geography === "national" || geography === "state") {
      setGeography("metro");
    }
  }, [criteriaGeographyRestricted, geography]);

  useEffect(() => {
    if (!sandboxDrillActive || isOverviewMode) {
      discoveryActivatedRef.current = null;
      return;
    }

    const cbsa = activeSandboxCbsa;
    if (!isDiscoveryMetro(cbsa, ingestedCbsas)) return;
    if (!activeShardReady) return;
    if (discoveryActivatedRef.current === cbsa) return;
    if (activeShardGeoJson.features.length === 0) return;

    discoveryActivatedRef.current = cbsa;
    enterDiscoveryMetro({ openDeepDive: false, markTourComplete: true });
  }, [
    sandboxDrillActive,
    isOverviewMode,
    activeSandboxCbsa,
    ingestedCbsas,
    activeShardReady,
    activeShardGeoJson,
    enterDiscoveryMetro,
  ]);

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
    setDeepDiveOpen(false);
    setDrawerOpen(false);
    setSelectedZip(top3[0].zip);
    setDiscoveryFlyover({ results: top3, index: 0, phase: "flying" });
  }, [discoveryResults, runDiscoveryRanking]);

  const handleSkipFlyover = useCallback(() => {
    setDiscoveryFlyover(null);
    setDiscoveryTourComplete(true);
    setDeepDiveOpen(false);
    setDrawerOpen(false);
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
        buildSandboxFlatRestore(activeSandboxCbsa, mergedMetroCameras),
      );
    }
  }, [
    sandboxDrillActive,
    discoveryFlyoverActive,
    geography,
    activeSandboxCbsa,
    mergedMetroCameras,
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
      setDrawerOpen(false);
    }
  }, [discoveryFlyover?.index, discoveryFlyover?.phase]);

  useEffect(() => {
    if (prevFlyoverRef.current && !discoveryFlyover && discoveryResults && discoveryResults.length > 0) {
      setDiscoveryTourComplete(true);
      setDeepDiveOpen(false);
      setDrawerOpen(false);
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

  const hideMapDetailOverlays =
    discoveryShellVisible && (deepDiveOpen || Boolean(selectedZip));

  const showAnalyticsOverlay =
    !hideMapDetailOverlays &&
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
    !discoveryShellVisible &&
    !discoveryFlyoverActive &&
    dcStoryActive &&
    activeSection === "detail";

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
        action: criteriaPanelOpen
          ? { label: "Map overview", onClick: handleMapOverview }
          : { label: "Your criteria", onClick: handleOpenCriteria },
      };
    }

    if (discoveryShellVisible && discoveryResults && discoveryResults.length > 0 && selectedZip) {
      const match =
        discoveryResults.find((r) => r.zip === selectedZip) ?? discoveryResults[0];
      const { metrics: m } = match;
      return {
        stepLabel: "Match",
        title: `${match.zip} — ${match.name}`,
        detail: `${match.matchPercent}% match · forecast ${formatPercent(m.homePriceForecast1yr)} · cap ${formatPercent(m.capRate)} · walk ${Math.round(m.walkabilityScore)}`,
        canOpen: true,
      };
    }

    if (discoveryMessage) {
      return {
        stepLabel: "Discovery",
        title: discoveryMessage,
        detail: "Adjust criteria or select a metro, then Explore city",
        canOpen: true,
        action: { label: "Your criteria", onClick: handleOpenCriteria },
      };
    }

    if (isOverviewMode) {
      if (selectedOverviewMetroFeature) {
        const metricLabel =
          METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "metric";
        const metricValue = getRawMetricFromFeature(
          selectedOverviewMetroFeature.properties,
          activeMetric,
        );
        return {
          stepLabel: "Metro",
          title: selectedOverviewMetroFeature.properties.neighborhoodName,
          detail: `${metricLabel}: ${formatActiveMetricValue(activeMetric, metricValue)} · tap Explore city for ZIP detail`,
          canOpen: true,
        };
      }

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
    handleMapOverview,
    criteriaPanelOpen,
    discoveryShellVisible,
    discoveryTourComplete,
    activeDiscoveryNeighborhood,
    discoveryResults,
    selectedZip,
    selectedOverviewMetroFeature,
  ]);

  const compareBarVisible =
    discoveryShellVisible && comparePinnedNeighborhoods.length > 0;

  const flyoverFeatureProps = useMemo(() => {
    if (!discoveryFlyover) return undefined;
    const zip = discoveryFlyover.results[discoveryFlyover.index]?.zip;
    if (!zip) return undefined;
    return activeShardGeoJson.features.find((f) => f.properties.zipCode === zip)?.properties;
  }, [discoveryFlyover, activeShardGeoJson]);

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
            {ingestedCbsas.size > 0
              ? ` ${ingestedCbsas.size} ingested metros (green outline) — click a metro, then Explore city to load ZIP boundaries.`
              : " Click Washington-Arlington-Alexandria, Orlando, SF Bay, or San Jose to open ZIP sandbox detail."}
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
        criteriaMode={criteriaGeographyRestricted}
        searchIndex={SEARCH_INDEX}
        onSearchSelect={handleSearchSelect}
        onToggleCriteriaView={handleCriteriaToggle}
        criteriaViewActive={criteriaPanelOpen}
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

      {compareBarVisible && (
        <div className="compare-bar" aria-label="Comparison neighborhoods">
          <CompareChips
            pinned={comparePinnedNeighborhoods}
            activeZip={selectedZip}
            onSelect={handleMatchSelect}
            onRemove={handleRemoveComparePin}
            onReorder={handleReorderComparePins}
          />
        </div>
      )}

      <div
        className={`cinematic${exploreMode ? " cinematic--explore" : ""}${isOverviewMode ? " cinematic--national" : ""}${cinematicTourActive ? " cinematic--tour" : ""}${discoveryShellVisible ? " cinematic--discovery" : ""}${criteriaPanelVisible && !discoveryShellVisible ? " cinematic--criteria" : ""}${deepDiveOpen ? " cinematic--deep-dive" : ""}${compareBarVisible ? " cinematic--compare" : ""}${discoveryFlyoverActive ? " cinematic--flyover" : ""}`}
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

        {criteriaPanelVisible && (
          <CriteriaPanel
            ref={criteriaPanelRef}
            criteria={discoveryCriteria}
            resetCriteria={sandboxDiscoveryCriteria}
            geoJson={criteriaNeedsMetroSelection ? null : activeShardGeoJson}
            onChange={handleApplyCriteria}
            onFindMatches={handleDiscover}
            exampleZips={exampleZips}
            selectedZip={selectedZip}
            zipLabels={zipLabelMap}
            onAddExample={handleAddExample}
            onRemoveExample={handleRemoveExample}
            needsMetroSelection={criteriaNeedsMetroSelection}
          />
        )}

        {discoveryShellVisible && discoveryResults && discoveryResults.length > 0 && !deepDiveOpen && (
          <MatchesList
            results={discoveryResults}
            selectedZip={selectedZip}
            favorites={favorites}
            onSelect={handleMatchSelect}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {discoveryShellVisible && deepDiveOpen && deepDiveNeighborhood && (
          <DiscoveryDeepDivePanel
            key="deep-dive-panel"
            neighborhood={deepDiveNeighborhood}
            criteria={discoveryCriteria}
            geoJson={activeShardGeoJson}
            metroAvgPsf={metroAvgPsf}
            featureProps={selectedFeature}
            mapCenter={zipCenter}
            onBack={handleDeepDiveBack}
          />
        )}

        <div className="cinematic__map">
          {discoveryShellVisible && comparePinOfferZip && (
            <div className="compare-pin-offer" role="status">
              <span>
                Pin {comparePinOfferZip}
                {comparePinOfferName ? ` · ${comparePinOfferName}` : ""} to compare?
              </span>
              <button
                type="button"
                className="compare-pin-offer__pin"
                onClick={() => handlePinToCompare(comparePinOfferZip)}
              >
                Pin
              </button>
              <button
                type="button"
                className="compare-pin-offer__dismiss"
                onClick={() => setComparePinOfferZip(null)}
              >
                Dismiss
              </button>
            </div>
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
            selectedZip={isOverviewMode ? selectedOverviewMetro : selectedZip}
            onZipSelect={discoveryShellVisible ? handleMapZipSelect : handleZipSelect}
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
            ingestedCbsas={ingestedCbsas}
            criteriaMode={criteriaGeographyRestricted}
          />
          {showExploreCityBar && selectedOverviewMetroFeature && (
            <ExploreCityBar
              metroName={selectedOverviewMetroFeature.properties.neighborhoodName}
              loading={exploreCityLoading}
              onExploreCity={handleExploreCity}
              onDismiss={handleDismissExploreCity}
            />
          )}
          {showCinematicEntry && (
            <CinematicEntryBar
              metroName={activeShardGeoJson.metadata.metro}
              showStoryMode={activeSandboxCbsa === DC_METRO_CBSA}
              onTourTopNeighborhoods={handleStartFlyoverTour}
              onStoryMode={
                activeSandboxCbsa === DC_METRO_CBSA ? handleResumeDcStory : undefined
              }
              optional
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
          {discoveryFlyoverActive && activeDiscoveryNeighborhood && discoveryFlyover && (
            <CinematicTourDeck
              neighborhood={activeDiscoveryNeighborhood}
              index={discoveryFlyover.index}
              total={discoveryFlyover.results.length}
              phase={discoveryFlyover.phase}
              photo={neighborhoodPhoto ?? null}
              quoteText={flyoverFeatureProps?.localQuote}
              primaryVibe={flyoverFeatureProps?.primaryVibe}
              onSkip={handleSkipFlyover}
            />
          )}
          <Google3DTilesBadge status={tilesStatus} />
          {showAnalyticsOverlay && activeDiscoveryNeighborhood && !discoveryShellVisible && (
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
