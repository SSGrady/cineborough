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
  DISCOVERY_MATCH_THRESHOLD,
  MAX_EXAMPLE_ZIPS,
  type DiscoveryCriteria,
  type DiscoveryFilterMetric,
  type RankedNeighborhood,
  discoveryCriteriaForSandbox,
  dedupeRankedMatchesByDisplayName,
  sortRankedNeighborhoods,
  getDiscoveryMetricLabel,
  getRawMetricFromFeature,
  getCriteriaChoroplethMetric,
} from "@cineborough/data";
import {
  resolveMapCamera,
  isOverviewGeography,
  buildOverviewRestoreCamera,
  buildSandboxFlatRestore,
  boundsFromGeoJsonGeometry,
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
import { fetchDiscoveryRank, criteriaHash, criteriaMatchHash } from "@/lib/reactive-discovery";
import { matchKey } from "@/lib/match-keys";
import { MapView } from "./MapView";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ContextChip } from "./ContextChip";
import { StoryDrawer } from "./StoryDrawer";
import { CriteriaPanel } from "./CriteriaPanel";
import { MatchesList } from "./MatchesList";
import { LocaleQuoteCard } from "./LocaleQuoteCard";
import { ZipDetailPanel } from "./ZipDetailPanel";
import { PropertyValuationPanel } from "./PropertyValuationPanel";
import { UsMapInsets } from "./UsMapInsets";
import { DiscoveryDeepDivePanel } from "./DiscoveryDeepDivePanel";
import { NeighborhoodPhotoHero } from "./NeighborhoodPhotoHero";
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
  national: "Continental US · read-only overview",
  state: "State view · click a state to zoom to its metros",
  metro: "All metros · click to open Your criteria",
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

type DiscoveryScope = "metro" | "national" | null;

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
  const [discoveryScope, setDiscoveryScope] = useState<DiscoveryScope>(null);
  const [criteriaPanelOpen, setCriteriaPanelOpen] = useState(false);
  const criteriaPanelRef = useRef<HTMLElement>(null);
  const [exampleZips, setExampleZips] = useState<string[]>(() => loadDiscoveryExamples());
  const [favorites, setFavorites] = useState<Set<string>>(() => loadDiscoveryFavorites());
  const [discoveryCriteria, setDiscoveryCriteria] = useState<DiscoveryCriteria>(() =>
    loadDiscoveryCriteria(),
  );
  const [discoveryResults, setDiscoveryResults] = useState<RankedNeighborhood[] | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [matchingInFlight, setMatchingInFlight] = useState(false);
  const [matchesDeckOpen, setMatchesDeckOpen] = useState(false);
  const [matchesDeckCollapsed, setMatchesDeckCollapsed] = useState(true);
  const [selectedMatchKey, setSelectedMatchKey] = useState<string | null>(null);
  const rankAbortRef = useRef<AbortController | null>(null);
  const rankDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRankedHashRef = useRef<string | null>(null);
  const lastRankedMatchHashRef = useRef<string | null>(null);
  const cameraLockedByUserRef = useRef(false);
  const [explicitFlyTarget, setExplicitFlyTarget] = useState<MapCameraTarget | null>(null);
  const [rankCriteria, setRankCriteria] = useState<DiscoveryCriteria>(() => loadDiscoveryCriteria());
  const [viewportBounds, setViewportBounds] = useState<
    [[number, number], [number, number]] | null
  >(null);
  const [loadedShards, setLoadedShards] = useState<Record<string, DcMetroGeoJson>>({});
  const [ingestedCbsas, setIngestedCbsas] = useState<Set<string>>(new Set());
  const [metroCameras, setMetroCameras] = useState<Record<string, MapCameraTarget>>({});
  const [selectedOverviewMetro, setSelectedOverviewMetro] = useState<string | null>(null);
  const [selectedMetroCamera, setSelectedMetroCamera] = useState<MapCameraTarget | null>(null);
  const [metroStateFilter, setMetroStateFilter] = useState<string | null>(null);
  const [stateFitBounds, setStateFitBounds] = useState<{
    bounds: [[number, number], [number, number]];
    token: number;
  } | null>(null);
  const [exploreCityLoading, setExploreCityLoading] = useState(false);
  const loadingShardsRef = useRef<Set<string>>(new Set());
  const shardLoadPromisesRef = useRef<Map<string, Promise<DcMetroGeoJson | undefined>>>(
    new Map(),
  );
  const discoveryActivatedRef = useRef<string | null>(null);
  const overviewMetroToCriteriaRef = useRef<(cbsa: string) => void>(() => {});

  const ensureMetroShard = useCallback(
    async (cbsaCode: string): Promise<DcMetroGeoJson | undefined> => {
      const bundled = loadMetroShard(cbsaCode);
      if (bundled) return bundled;
      if (loadedShards[cbsaCode]) return loadedShards[cbsaCode];

      const inFlight = shardLoadPromisesRef.current.get(cbsaCode);
      if (inFlight) return inFlight;

      const loadPromise = (async (): Promise<DcMetroGeoJson | undefined> => {
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
          shardLoadPromisesRef.current.delete(cbsaCode);
        }
      })();

      shardLoadPromisesRef.current.set(cbsaCode, loadPromise);
      return loadPromise;
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
    activeSandboxCbsa === DC_METRO_CBSA &&
    geography !== "zip";

  const cinematicTourActive = dcStoryActive;

  const labelHighlightZip = useMemo((): string | null => {
    if (!cinematicTourActive || isOverviewMode) return null;
    if (dcStoryActive && activeSection !== "metro") {
      return selectedZip;
    }
    return null;
  }, [
    cinematicTourActive,
    isOverviewMode,
    dcStoryActive,
    activeSection,
    selectedZip,
  ]);

  const enable3DTiles = is3DTilesActive();
  const use3DCameraPath = is3DTilesFlagEnabled() && dcStoryActive;
  const tilesStatus = getGoogle3DTilesStatus();
  const photoHeroEnabled = isPhotoHeroEnabled();

  const emptyShardGeoJson = useMemo(
    (): DcMetroGeoJson => ({
      type: "FeatureCollection",
      metadata: {
        metro: "Loading metro…",
        dataAsOf: geoJson.metadata.dataAsOf,
        dataAsOfLabel: geoJson.metadata.dataAsOfLabel,
        sandboxZips: [],
        generatedAt: geoJson.metadata.generatedAt,
      },
      features: [],
    }),
    [geoJson.metadata],
  );

  const activeShardGeoJson = useMemo((): DcMetroGeoJson => {
    const bundled = loadMetroShard(activeSandboxCbsa);
    if (bundled) return bundled;
    const loaded = loadedShards[activeSandboxCbsa];
    if (loaded) return loaded;
    return emptyShardGeoJson;
  }, [activeSandboxCbsa, loadedShards, emptyShardGeoJson]);

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
    if (metroStateFilter) {
      return {
        ...US_METROS_GEOJSON,
        features: US_METROS_GEOJSON.features.filter(
          (f) => f.properties.state?.trim() === metroStateFilter,
        ),
      };
    }
    return US_METROS_GEOJSON;
  }, [geography, activeMetric, metroStateFilter]);

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
      return `${activeShardGeoJson.metadata.metro} · flat discovery view`;
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

  const resetToGeographyOverview = useCallback(
    (targetLevel: GeographyLevel, options?: { closeCriteria?: boolean }) => {
      cameraLockedByUserRef.current = false;
      setExplicitFlyTarget(null);

      if (options?.closeCriteria) {
        setCriteriaPanelOpen(false);
        setDiscoveryShellActive(false);
        setDiscoveryResults(null);
        setDiscoveryScope(null);
      } else {
        // Criteria stay open — drop cached rank so scope change re-runs matching.
        lastRankedHashRef.current = null;
      }

      setSearchFlyTarget(null);
      setSelectedOverviewMetro(null);
      setSelectedMetroCamera(null);
      setMetroStateFilter(null);
      setStateFitBounds(null);
      setSelectedZip(null);
      setSelectedPropertyId(null);
      setDeepDiveOpen(false);
      setDrawerOpen(false);
      setStoryCameraActive(false);
      setDiscoveryMessage(null);

      if (targetLevel === "zip" && sandboxDrillActive) {
        setGeography("zip");
        setActiveSection("metro");
        setExitRestoreTarget(
          buildSandboxFlatRestore(activeSandboxCbsa, mergedMetroCameras),
        );
        return;
      }

      if (!isOverviewGeography(targetLevel)) return;

      setSandboxDrillActive(false);
      setGeography(targetLevel);
      if (targetLevel === "national") setUsInsetRegion("continental");
    },
    [sandboxDrillActive, activeSandboxCbsa, mergedMetroCameras],
  );

  const handleGeographyChange = useCallback(
    (level: GeographyLevel) => {
      if (level === "zip" && !sandboxDrillActive) return;
      resetToGeographyOverview(level);
    },
    [sandboxDrillActive, resetToGeographyOverview],
  );

  const handleUserMapMove = useCallback(() => {
    if (exploreMode) return;
    cameraLockedByUserRef.current = true;
    setExplicitFlyTarget(null);
    if (dcStoryActive) {
      setStoryCameraActive(false);
    }
    setSearchFlyTarget(null);
  }, [exploreMode, dcStoryActive]);

  const requestFlyTo = useCallback((center: [number, number]) => {
    if (!isFiniteLngLat(center)) return;
    cameraLockedByUserRef.current = false;
    setExplicitFlyTarget(discoveryFlyoverCamera(center));
  }, []);

  const flyToZip = useCallback(
    (zip: string) => {
      const match = discoveryResults?.find((r) => r.zip === zip);
      if (match && isFiniteLngLat(match.center)) {
        requestFlyTo(match.center);
        return;
      }
      const feature = activeShardGeoJson.features.find((f) => f.properties.zipCode === zip);
      if (!feature) return;
      const centroid = centroidFromGeoJsonGeometry(feature.geometry);
      if (centroid && isFiniteLngLat(centroid)) {
        requestFlyTo(centroid);
        return;
      }
      const { labelLng, labelLat } = feature.properties;
      if (isFiniteLngLat([labelLng, labelLat])) {
        requestFlyTo([labelLng, labelLat]);
      }
    },
    [discoveryResults, activeShardGeoJson, requestFlyTo],
  );

  useEffect(() => {
    if (!explicitFlyTarget) return;
    // Hold fly target while deep-dive match is selected — clearing lets sandbox metro camera win.
    if (deepDiveOpen && (selectedMatchKey || selectedZip)) return;
    const timer = window.setTimeout(
      () => setExplicitFlyTarget(null),
      (explicitFlyTarget.duration ?? FLYOVER_CAMERA_MS) + 100,
    );
    return () => window.clearTimeout(timer);
  }, [explicitFlyTarget, deepDiveOpen, selectedMatchKey, selectedZip]);

  const handleInsetSelect = useCallback((region: UsInsetRegion) => {
    setUsInsetRegion(region);
    setGeography("national");
    setSandboxDrillActive(false);
    setStoryCameraActive(false);
    setSelectedOverviewMetro(null);
    setSelectedMetroCamera(null);
  }, []);

  const handleStateSelect = useCallback(
    (stateAbbr: string) => {
      const stateFeature = buildStateChoroplethFromMetros(
        US_METROS_GEOJSON,
        activeMetric,
      ).features.find((f) => f.properties.zipCode === stateAbbr);
      if (!stateFeature) return;

      const bounds = boundsFromGeoJsonGeometry(stateFeature.geometry);
      if (bounds) {
        setStateFitBounds({ bounds, token: Date.now() });
      }

      setMetroStateFilter(stateAbbr);
      setSelectedOverviewMetro(null);
      setSelectedMetroCamera(null);
      setSearchFlyTarget(null);
      setExitRestoreTarget(null);
      setGeography("metro");
    },
    [activeMetric],
  );

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

        if (geography === "metro" && !criteriaPanelOpen) {
          overviewMetroToCriteriaRef.current(regionId);
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
          overviewMetroToCriteriaRef.current(regionId);
          return;
        }

        return;
      }

      const discoveryMatch = discoveryResults?.find((r) => r.zip === regionId);
      const targetCbsa = discoveryMatch?.cbsaCode ?? sandboxCbsaForZip(regionId);
      if (targetCbsa) {
        setActiveSandboxCbsa(targetCbsa);
        if (!SANDBOX_CBSA.has(targetCbsa)) {
          void ensureMetroShard(targetCbsa);
        }
      }

      setSelectedZip(regionId);
      setSelectedPropertyId(null);

      // Matching mode keeps criteria/deep-dive chrome — map overview is explicit only.
      if (criteriaPanelOpen || discoveryShellActive) {
        return;
      }

      setActiveSection("detail");
      setGeography("zip");
      setStoryCameraActive(targetCbsa === DC_METRO_CBSA);
      setScrollProgress(targetCbsa === DC_METRO_CBSA ? 1 : 0);
    },
    [
      isOverviewMode,
      geography,
      criteriaPanelOpen,
      sandboxDrillActive,
      ingestedCbsas,
      discoveryResults,
      discoveryShellActive,
      ensureMetroShard,
    ],
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
        setUsInsetRegion("continental");
        overviewMetroToCriteriaRef.current(result.id);
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
    if (exploreMode) return;

    cameraLockedByUserRef.current = false;
    setExplicitFlyTarget(null);

    if (sandboxDrillActive) {
      const overviewLevel: GeographyLevel = geography === "zip" ? "metro" : geography;
      resetToGeographyOverview(overviewLevel);
      return;
    }

    if (isOverviewMode) {
      setSelectedOverviewMetro(null);
      setSelectedMetroCamera(null);
      setMetroStateFilter(null);
      setExitRestoreTarget(
        buildOverviewRestoreCamera(savedOverviewCameraRef.current, usInsetRegion),
      );
    }
  }, [
    exploreMode,
    isOverviewMode,
    sandboxDrillActive,
    geography,
    usInsetRegion,
    resetToGeographyOverview,
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

  const discoveryMatchCenter = useMemo((): [number, number] | null => {
    if (!selectedZip) return null;
    if (zipCenter) return zipCenter;
    const match =
      discoveryResults?.find((r) => r.zip === selectedZip) ??
      (selectedMatchKey
        ? discoveryResults?.find((r) => matchKey(r) === selectedMatchKey)
        : undefined);
    if (match && isFiniteLngLat(match.center)) return match.center;
    return null;
  }, [selectedZip, zipCenter, discoveryResults, selectedMatchKey]);

  const discoveryShellVisible = criteriaPanelOpen;
  const criteriaPanelVisible = criteriaPanelOpen && !deepDiveOpen;
  const criteriaGeographyRestricted = criteriaPanelOpen;
  const displayMatchResults = useMemo(() => {
    if (!discoveryResults?.length) return [];
    return dedupeRankedMatchesByDisplayName(discoveryResults, discoveryCriteria);
  }, [discoveryResults, discoveryCriteria]);

  const showMatchDeckControls =
    criteriaPanelOpen && displayMatchResults.length > 0 && !deepDiveOpen;
  const showMatchDeckExpanded =
    showMatchDeckControls && matchesDeckOpen && !matchesDeckCollapsed;
  const matchCount = displayMatchResults.length;

  const scorableMetroCount = ingestedCbsas.size > 0 ? ingestedCbsas.size : SANDBOX_CBSA.size;

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
  const nationalCriteriaMode = criteriaNeedsMetroSelection && isOverviewMode;

  const criteriaShardGeoJson = useMemo((): DcMetroGeoJson | null => {
    if (!selectedDiscoveryCbsa) return null;
    const bundled = loadMetroShard(selectedDiscoveryCbsa);
    if (bundled) return bundled;
    if (loadedShards[selectedDiscoveryCbsa]) return loadedShards[selectedDiscoveryCbsa];
    if (sandboxDrillActive && activeSandboxCbsa === selectedDiscoveryCbsa) {
      return activeShardGeoJson;
    }
    return null;
  }, [
    selectedDiscoveryCbsa,
    loadedShards,
    sandboxDrillActive,
    activeSandboxCbsa,
    activeShardGeoJson,
  ]);

  useEffect(() => {
    if (!criteriaPanelVisible || !selectedDiscoveryCbsa) return;
    if (criteriaShardGeoJson) return;
    void ensureMetroShard(selectedDiscoveryCbsa);
  }, [criteriaPanelVisible, selectedDiscoveryCbsa, criteriaShardGeoJson, ensureMetroShard]);

  const deepDiveNeighborhood = useMemo((): RankedNeighborhood | null => {
    if (!deepDiveOpen || !discoveryResults) return null;
    if (selectedMatchKey) {
      return discoveryResults.find((r) => matchKey(r) === selectedMatchKey) ?? null;
    }
    if (!selectedZip) return null;
    return discoveryResults.find((r) => r.zip === selectedZip) ?? null;
  }, [deepDiveOpen, selectedMatchKey, selectedZip, discoveryResults]);

  const cameraTarget = useMemo(() => {
    if (exploreMode) return null;

    if (exitRestoreTarget && isValidCameraTarget(exitRestoreTarget)) {
      return exitRestoreTarget;
    }

    if (
      explicitFlyTarget &&
      !cameraLockedByUserRef.current &&
      isValidCameraTarget(explicitFlyTarget)
    ) {
      return explicitFlyTarget;
    }

    if (
      deepDiveOpen &&
      discoveryMatchCenter &&
      !cameraLockedByUserRef.current &&
      sandboxDrillActive
    ) {
      return discoveryFlyoverCamera(discoveryMatchCenter);
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
      geography !== "zip" &&
      !(deepDiveOpen && selectedZip)
    ) {
      const sandboxCamera =
        SANDBOX_METRO_CAMERAS[activeSandboxCbsa] ?? metroCameras[activeSandboxCbsa];
      if (sandboxCamera) return sandboxCamera;
    }

    const suppressZipCamera = discoveryShellVisible;

    return resolveMapCamera({
      geography,
      zipCenter: suppressZipCamera ? null : zipCenter,
      exploreMode,
      cinematicSection: activeSection,
      sandboxCinematicActive:
        storyCameraActive &&
        sandboxDrillActive &&
        activeSandboxCbsa === DC_METRO_CBSA,
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
    exitRestoreTarget,
    use3DCameraPath,
    discoveryShellVisible,
    explicitFlyTarget,
    metroCameras,
    selectedMetroCamera,
    deepDiveOpen,
    discoveryMatchCenter,
    selectedZip,
  ]);

  const pathVisible =
    dcStoryActive &&
    (activeSection === "neighborhood" ||
      activeSection === "detail" ||
      scrollProgress > 0.35);

  const pathFilterZip = dcStoryActive ? "22201" : null;

  const amenityHighlightZip = null;

  const zipLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of activeShardGeoJson.features) {
      map.set(f.properties.zipCode, f.properties.neighborhoodName);
    }
    return map;
  }, [activeShardGeoJson]);

  const showMetricSidebar = !criteriaPanelOpen;

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

  const applyRankedResults = useCallback(
    (
      results: RankedNeighborhood[],
      scope: DiscoveryScope,
      criteria: DiscoveryCriteria,
    ) => {
      const normalized =
        scope === "national"
          ? dedupeRankedMatchesByDisplayName(results, criteria)
          : sortRankedNeighborhoods(results, criteria);
      setDiscoveryScope(scope);
      setDiscoveryShellActive(true);
      setDiscoveryCriteria(criteria);
      saveDiscoveryCriteria(criteria);
      setDiscoveryResults(normalized);
      setDiscoveryMessage(null);
      if (normalized.length > 0) {
        setMatchesDeckOpen(true);
        setMatchesDeckCollapsed(true);
      } else {
        setMatchesDeckOpen(false);
        setDiscoveryMessage(
          `No neighborhoods match your criteria (below ${DISCOVERY_MATCH_THRESHOLD}% match)`,
        );
      }
    },
    [],
  );

  const runReactiveRanking = useCallback(
    async (criteria: DiscoveryCriteria) => {
      if (criteria.filters.length === 0) {
        rankAbortRef.current?.abort();
        setDiscoveryResults(null);
        setMatchesDeckOpen(false);
        setMatchingInFlight(false);
        lastRankedHashRef.current = null;
        lastRankedMatchHashRef.current = null;
        return;
      }

      const selectedCbsa = resolveSelectedDiscoveryCbsa(
        sandboxDrillActive,
        activeSandboxCbsa,
        selectedOverviewMetro,
        ingestedCbsas,
      );
      const scopeKey = selectedCbsa ?? "national";
      const matchHash = criteriaMatchHash(criteria);
      const hash = `${criteriaHash(criteria)}|${exampleZips.join(",")}|${scopeKey}`;
      if (hash === lastRankedHashRef.current) {
        return;
      }

      // Sort-only changes (High Priority / Just This) — re-order without re-scoring.
      if (
        matchHash === lastRankedMatchHashRef.current &&
        discoveryResults &&
        discoveryResults.length > 0
      ) {
        const resorted =
          scopeKey === "national"
            ? dedupeRankedMatchesByDisplayName(discoveryResults, criteria)
            : sortRankedNeighborhoods(discoveryResults, criteria);
        lastRankedHashRef.current = hash;
        applyRankedResults(resorted, scopeKey === "national" ? "national" : "metro", criteria);
        return;
      }

      lastRankedMatchHashRef.current = matchHash;

      rankAbortRef.current?.abort();
      const controller = new AbortController();
      rankAbortRef.current = controller;
      setMatchingInFlight(true);

      try {
        if (
          selectedCbsa &&
          sandboxDrillActive &&
          activeSandboxCbsa === selectedCbsa &&
          activeShardReady &&
          activeShardGeoJson.features.length > 0
        ) {
          const ranked = rankNeighborhoods(activeShardGeoJson, criteria, { topN: 0 }).map(
            (entry) => ({
              ...entry,
              cbsaCode: selectedCbsa,
              metroName: activeShardGeoJson.metadata.metro,
            }),
          );
          const results = applySimilarityScores(ranked, activeShardGeoJson, exampleZips);
          if (controller.signal.aborted) return;
          lastRankedHashRef.current = hash;
          applyRankedResults(results, "metro", criteria);
          return;
        }

        if (selectedCbsa && isDiscoveryMetro(selectedCbsa, ingestedCbsas)) {
          const payload = await fetchDiscoveryRank(criteria, {
            scope: "metro",
            cbsaCode: selectedCbsa,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          lastRankedHashRef.current = hash;
          applyRankedResults(payload.results, "metro", criteria);
          return;
        }

        const payload = await fetchDiscoveryRank(criteria, {
          scope: "national",
          signal: controller.signal,
          viewportBounds: viewportBounds ?? undefined,
        });
        if (controller.signal.aborted) return;
        lastRankedHashRef.current = hash;
        applyRankedResults(payload.results, "national", criteria);
      } catch (error) {
        if (controller.signal.aborted) return;
        setDiscoveryMessage("Matching failed — try adjusting criteria");
      } finally {
        if (!controller.signal.aborted) {
          setMatchingInFlight(false);
        }
      }
    },
    [
      sandboxDrillActive,
      activeSandboxCbsa,
      selectedOverviewMetro,
      ingestedCbsas,
      activeShardReady,
      activeShardGeoJson,
      exampleZips,
      applyRankedResults,
      viewportBounds,
      discoveryResults,
      discoveryScope,
    ],
  );

  const handleCriteriaCommit = useCallback(
    (committed?: DiscoveryCriteria) => {
      const next = committed ?? discoveryCriteria;
      setRankCriteria(next);
      setDiscoveryResults((prev) => {
        if (!prev?.length) return prev;
        return discoveryScope === "national"
          ? dedupeRankedMatchesByDisplayName(prev, next)
          : sortRankedNeighborhoods(prev, next);
      });
    },
    [discoveryCriteria, discoveryScope],
  );

  useEffect(() => {
    if (!criteriaPanelOpen) return;

    if (rankDebounceRef.current) {
      clearTimeout(rankDebounceRef.current);
    }

    const delay = nationalCriteriaMode ? 350 : 200;
    rankDebounceRef.current = setTimeout(() => {
      void runReactiveRanking(rankCriteria);
    }, delay);

    return () => {
      if (rankDebounceRef.current) {
        clearTimeout(rankDebounceRef.current);
      }
    };
  }, [criteriaPanelOpen, rankCriteria, exampleZips, runReactiveRanking, nationalCriteriaMode]);

  useEffect(() => {
    if (!criteriaPanelOpen) {
      rankAbortRef.current?.abort();
      setMatchingInFlight(false);
    }
  }, [criteriaPanelOpen]);

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

  const handleToggleFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveDiscoveryFavorites(next);
      return next;
    });
  }, []);

  const resolveMatchCenter = useCallback(
    (match: RankedNeighborhood, shard?: DcMetroGeoJson | null): [number, number] => {
      const feature = shard?.features.find((f) => f.properties.zipCode === match.zip);
      if (feature) {
        const centroid = centroidFromGeoJsonGeometry(feature.geometry);
        if (centroid && isFiniteLngLat(centroid)) return centroid;
        const { labelLng, labelLat } = feature.properties;
        if (isFiniteLngLat([labelLng, labelLat])) return [labelLng, labelLat];
      }
      return match.center;
    },
    [],
  );

  const resolveMatchMetroCbsa = useCallback((match: RankedNeighborhood): string | null => {
    return match.cbsaCode ?? sandboxCbsaForZip(match.zip) ?? null;
  }, []);

  const activateDiscoveryMatch = useCallback(
    (match: RankedNeighborhood, shard: DcMetroGeoJson | null) => {
      setExitRestoreTarget(null);
      setSearchFlyTarget(null);
      setSelectedZip(match.zip);
      setSelectedPropertyId(null);
      setStoryCameraActive(false);
      if (criteriaPanelOpen) {
        setDeepDiveOpen(true);
        setDrawerOpen(false);
      } else {
        setGeography("zip");
        setActiveSection("detail");
        setScrollProgress(0);
        if (discoveryShellActive) {
          setDeepDiveOpen(true);
          setDrawerOpen(false);
        } else {
          setDrawerOpen(true);
        }
      }
      requestFlyTo(resolveMatchCenter(match, shard));
    },
    [criteriaPanelOpen, discoveryShellActive, requestFlyTo, resolveMatchCenter],
  );

  const handleMatchSelect = useCallback(
    (key: string, match: RankedNeighborhood) => {
      setSelectedMatchKey(key);
      cameraLockedByUserRef.current = false;
      setDiscoveryMessage(null);

      const targetCbsa = resolveMatchMetroCbsa(match);
      const existingShard = targetCbsa
        ? loadMetroShard(targetCbsa) ?? loadedShards[targetCbsa] ?? null
        : null;

      if (discoveryScope === "national") {
        setDiscoveryScope("metro");
      }

      if (targetCbsa) {
        setActiveSandboxCbsa(targetCbsa);
        setSandboxDrillActive(true);
        setStoryCameraActive(false);
        setSelectedOverviewMetro(null);
        setSelectedMetroCamera(null);
        setSearchFlyTarget(null);
      }

      activateDiscoveryMatch(match, existingShard);

      if (targetCbsa && !existingShard) {
        setExploreCityLoading(true);
        void ensureMetroShard(targetCbsa)
          .then((shard) => {
            if (!shard) {
              setDiscoveryMessage(
                `${match.name} — metro boundaries unavailable; match details shown below`,
              );
            }
          })
          .finally(() => {
            setExploreCityLoading(false);
          });
      } else if (!targetCbsa) {
        setDiscoveryMessage(
          `${match.name} — metro unknown; showing ranked match at map center`,
        );
      }
    },
    [
      resolveMatchMetroCbsa,
      loadedShards,
      discoveryScope,
      activateDiscoveryMatch,
      ensureMetroShard,
    ],
  );

  const handleDeepDiveBack = useCallback(() => {
    setDeepDiveOpen(false);
    setSelectedZip(null);
    setSelectedMatchKey(null);
    setGeography("metro");
    cameraLockedByUserRef.current = false;
    setExplicitFlyTarget(null);
  }, []);

  const handleMapZipSelect = useCallback(
    (regionId: string | null) => {
      if (!regionId) {
        setSelectedZip(null);
        setSelectedPropertyId(null);
        setSelectedMatchKey(null);
        setDeepDiveOpen(false);
        return;
      }

      if (!discoveryShellActive || !sandboxDrillActive || isOverviewMode) {
        handleZipSelect(regionId);
        return;
      }

      setSearchFlyTarget(null);
      setExitRestoreTarget(null);

      const discoveryMatch = discoveryResults?.find((r) => r.zip === regionId);
      const targetCbsa = discoveryMatch?.cbsaCode ?? sandboxCbsaForZip(regionId);
      if (targetCbsa) {
        setActiveSandboxCbsa(targetCbsa);
        if (!SANDBOX_CBSA.has(targetCbsa)) {
          void ensureMetroShard(targetCbsa);
        }
      }

      setSelectedZip(regionId);
      setSelectedPropertyId(null);

      if (discoveryMatch) {
        setSelectedMatchKey(matchKey(discoveryMatch));
        flyToZip(regionId);
        setDeepDiveOpen(true);
        setDrawerOpen(false);
      } else {
        setSelectedMatchKey(null);
        setDeepDiveOpen(false);
      }
    },
    [
      handleZipSelect,
      discoveryShellActive,
      sandboxDrillActive,
      isOverviewMode,
      discoveryResults,
      ensureMetroShard,
      flyToZip,
    ],
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
      geoJson?: DcMetroGeoJson;
      criteria?: DiscoveryCriteria;
    }) => {
      setDiscoveryMessage(null);
      setStoryCameraActive(false);
      setSearchFlyTarget(null);
      setExitRestoreTarget(null);
      setDiscoveryShellActive(true);
      setCriteriaPanelOpen(true);
      setDiscoveryScope("metro");

      const criteria = options?.criteria ?? discoveryCriteria;
      if (options?.criteria) {
        setDiscoveryCriteria(criteria);
        saveDiscoveryCriteria(criteria);
      }

      const shard = options?.geoJson ?? activeShardGeoJson;
      if (shard.features.length === 0) {
        setDiscoveryResults([]);
        setDiscoveryMessage("No neighborhoods in this metro");
        setDeepDiveOpen(false);
        return;
      }

      const ranked = rankNeighborhoods(shard, criteria, { topN: 0 }).map((entry) => ({
        ...entry,
        cbsaCode: activeSandboxCbsa,
        metroName: shard.metadata.metro,
      }));
      const results = applySimilarityScores(ranked, shard, exampleZips);

      if (results.length === 0) {
        setDiscoveryResults([]);
        setDiscoveryMessage(
          `No neighborhoods match your criteria (below ${DISCOVERY_MATCH_THRESHOLD}% match)`,
        );
        setDeepDiveOpen(false);
        return;
      }

      setDiscoveryResults(results);
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

  const enterNationalDiscovery = useCallback(
    (
      results: RankedNeighborhood[],
      criteria: DiscoveryCriteria,
      stats?: { metrosScored: number; neighborhoodsScored: number },
    ) => {
      setDiscoveryMessage(null);
      setDiscoveryScope("national");
      setDiscoveryShellActive(true);
      setCriteriaPanelOpen(true);
      setDiscoveryCriteria(criteria);
      saveDiscoveryCriteria(criteria);
      setDeepDiveOpen(false);
      setSelectedZip(null);
      setDrawerOpen(false);
      setDiscoveryResults(dedupeRankedMatchesByDisplayName(results, criteria));

      if (results.length === 0) {
        setDiscoveryMessage(
          `No neighborhoods match your criteria nationally (below ${DISCOVERY_MATCH_THRESHOLD}% match)`,
        );
        setMatchesDeckOpen(false);
        return;
      }

      setMatchesDeckOpen(true);
      setMatchesDeckCollapsed(false);
      if (stats) {
        setDiscoveryMessage(
          `Top ${results.length} matches across ${stats.metrosScored} metros · ${stats.neighborhoodsScored.toLocaleString()} neighborhoods scored`,
        );
      }
    },
    [],
  );

  const handleApplyArchetype = useCallback(
    (criteria: DiscoveryCriteria) => {
      handleApplyCriteria(criteria);
      setRankCriteria(criteria);
    },
    [handleApplyCriteria],
  );

  overviewMetroToCriteriaRef.current = (cbsa: string) => {
    if (!isDiscoveryMetro(cbsa, ingestedCbsas)) {
      setDiscoveryMessage("Metro data unavailable — try another metro");
      return;
    }

    setExploreCityLoading(true);
    void drillIntoDiscoveryMetro(cbsa)
      .then((shard) => {
        if (!shard) {
          setDiscoveryMessage("Metro data unavailable — try another metro");
          return;
        }
        enterDiscoveryMetro({
          openDeepDive: false,
          geoJson: shard,
        });
      })
      .finally(() => {
        setExploreCityLoading(false);
      });
  };

  const handleOpenCriteria = useCallback(() => {
    setCriteriaPanelOpen(true);
    setDiscoveryShellActive(true);
    setDiscoveryMessage(null);
    setRankCriteria(discoveryCriteria);
  }, [discoveryCriteria]);

  const handleMapOverview = useCallback(() => {
    resetToGeographyOverview("metro", { closeCriteria: true });
  }, [resetToGeographyOverview]);

  const handleCriteriaToggle = useCallback(() => {
    if (criteriaPanelOpen) {
      handleMapOverview();
      return;
    }
    handleOpenCriteria();
  }, [criteriaPanelOpen, handleOpenCriteria, handleMapOverview]);

  const handleToggleMatchDeck = useCallback(() => {
    if (showMatchDeckExpanded) {
      setMatchesDeckCollapsed(true);
      return;
    }
    setMatchesDeckOpen(true);
    setMatchesDeckCollapsed(false);
  }, [showMatchDeckExpanded]);

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
    if (geography === "state") {
      setGeography("metro");
    }
  }, [criteriaGeographyRestricted, geography]);

  useEffect(() => {
    if (!sandboxDrillActive || isOverviewMode) {
      discoveryActivatedRef.current = null;
      return;
    }

    // Match navigation sets selectedMatchKey before drill — don't reset zip/deep-dive.
    if (selectedMatchKey) return;

    const cbsa = activeSandboxCbsa;
    if (!isDiscoveryMetro(cbsa, ingestedCbsas)) return;
    if (!activeShardReady) return;
    if (discoveryActivatedRef.current === cbsa) return;
    if (activeShardGeoJson.features.length === 0) return;

    discoveryActivatedRef.current = cbsa;
    enterDiscoveryMetro({ openDeepDive: false });
  }, [
    sandboxDrillActive,
    isOverviewMode,
    activeSandboxCbsa,
    ingestedCbsas,
    activeShardReady,
    activeShardGeoJson,
    enterDiscoveryMetro,
    selectedMatchKey,
  ]);

  useEffect(() => {
    const wasSandbox = prevSandboxDrillRef.current;
    prevSandboxDrillRef.current = sandboxDrillActive;

    if (wasSandbox && !sandboxDrillActive && isOverviewGeography(geography)) {
      setExitRestoreTarget(
        buildOverviewRestoreCamera(savedOverviewCameraRef.current, usInsetRegion),
      );
    }
  }, [
    sandboxDrillActive,
    geography,
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

  const handleViewportBoundsChange = useCallback(
    (bounds: [[number, number], [number, number]]) => {
      setViewportBounds(bounds);
    },
    [],
  );

  const photoHeroZip = useMemo((): string | null => {
    if (dcStoryActive && activeSection === "detail" && selectedZip) {
      return selectedZip;
    }
    return null;
  }, [dcStoryActive, activeSection, selectedZip]);

  const photoHeroVisible =
    photoHeroEnabled &&
    photoHeroZip !== null &&
    !discoveryShellVisible &&
    dcStoryActive &&
    activeSection === "detail";

  const neighborhoodPhoto = photoHeroZip ? getNeighborhoodPhoto(photoHeroZip) : null;

  const metroDescription =
    !storyCameraActive && sandboxDrillActive
      ? "Story camera paused while you explore the map."
      : SCROLL_SECTIONS[0].description;

  const overviewFeatureCount = activeGeoJson.features.filter(
    (f) => f.properties.medianHomeValue > 0,
  ).length;

  const activeScrollSection = SCROLL_SECTIONS.find((s) => s.id === activeSection);

  const overviewTopBarChip = useMemo(() => {
    if (!isOverviewMode) return undefined;

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
        detail: `${metricLabel}: ${formatActiveMetricValue(activeMetric, metricValue)} · click metro to open ZIP detail`,
        onOpenDrawer: () => setDrawerOpen(true),
      };
    }

    const metricLabel =
      METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "metric";
    return {
      stepLabel: geography.charAt(0).toUpperCase() + geography.slice(1),
      title: "US Metro Overview",
      detail: `${overviewFeatureCount} metros · ${metricLabel}`,
      onOpenDrawer: () => setDrawerOpen(true),
    };
  }, [
    isOverviewMode,
    selectedOverviewMetroFeature,
    activeMetric,
    geography,
    overviewFeatureCount,
  ]);

  const contextChip = useMemo(() => {
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
        detail: "Adjust criteria or select a metro on the map",
        canOpen: true,
        action: { label: "Your criteria", onClick: handleOpenCriteria },
      };
    }

    if (isOverviewMode) {
      return null;
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
      detail: storyCameraActive
        ? "Guided story · scroll to explore"
        : "Flat view",
      canOpen: true,
    };
  }, [
    dcStoryActive,
    activeSection,
    activeScrollSection,
    storyCameraActive,
    selected,
    selectedFeature,
    activeMetric,
    activeShardGeoJson.metadata.metro,
    discoveryMessage,
    handleOpenCriteria,
    discoveryShellVisible,
    discoveryResults,
    selectedZip,
  ]);

  const drawerContent = useMemo(() => {
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
    handleZipSelect,
    handleEvaluateProperty,
    discoveryResults,
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
        showMatchTicker={criteriaPanelOpen}
        matchCount={matchCount}
        matchingInFlight={matchingInFlight}
        matchDeckExpanded={showMatchDeckExpanded}
        onToggleMatchDeck={showMatchDeckControls ? handleToggleMatchDeck : undefined}
        overviewChip={overviewTopBarChip}
        matchDeck={
          showMatchDeckExpanded ? (
            <MatchesList
              results={displayMatchResults}
              matchCount={matchCount}
              selectedKey={selectedMatchKey}
              favorites={favorites}
              onSelect={handleMatchSelect}
              onToggleFavorite={handleToggleFavorite}
              variant="deck"
              showHeader={false}
            />
          ) : undefined
        }
      />


      <div
        className={`cinematic${exploreMode ? " cinematic--explore" : ""}${isOverviewMode ? " cinematic--national" : ""}${cinematicTourActive ? " cinematic--tour" : ""}${criteriaPanelVisible ? " cinematic--criteria" : ""}${discoveryShellVisible ? " cinematic--discovery" : ""}${deepDiveOpen ? " cinematic--deep-dive" : ""}`}
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
            geoJson={criteriaNeedsMetroSelection ? null : criteriaShardGeoJson}
            onChange={handleApplyCriteria}
            exampleZips={exampleZips}
            selectedZip={selectedZip}
            zipLabels={zipLabelMap}
            onAddExample={handleAddExample}
            onRemoveExample={handleRemoveExample}
            nationalMode={nationalCriteriaMode}
            nationalMetroCount={scorableMetroCount}
            matchCount={matchCount}
            matchingInFlight={matchingInFlight}
            onApplyArchetype={handleApplyArchetype}
            onCriteriaCommit={handleCriteriaCommit}
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
          {contextChip && (
            <ContextChip
              stepLabel={contextChip.stepLabel}
              title={contextChip.title}
              detail={contextChip.detail}
              onOpenDrawer={contextChip.canOpen ? () => setDrawerOpen(true) : undefined}
              action={contextChip.action}
            />
          )}
          <MapView
            geoJson={activeGeoJson}
            activeMetric={activeMetric}
            selectedZip={isOverviewMode ? selectedOverviewMetro : selectedZip}
            onZipSelect={discoveryShellVisible ? handleMapZipSelect : handleZipSelect}
            onBackgroundClick={handleBackgroundClick}
            cameraTarget={cameraTarget}
            cameraInstant={dcStoryActive}
            pathVisible={pathVisible}
            pathTraceProgress={1}
            pathFilterZip={pathFilterZip}
            amenityHighlightZip={amenityHighlightZip}
            enable3DTiles={enable3DTiles}
            selectionBorderVisible
            exploreMode={exploreMode}
            onToggleExploreMode={handleToggleExplore}
            onUserMapMove={handleUserMapMove}
            onOverviewCameraCapture={handleOverviewCameraCapture}
            onViewportBoundsChange={handleViewportBoundsChange}
            mapBounds={mapBounds}
            geographyLevel={geography}
            overviewMode={isOverviewMode}
            fitNationalBounds={fitNationalBounds}
            cinematicOnSelect={!isOverviewMode}
            cinematicTourActive={cinematicTourActive}
            labelHighlightZip={labelHighlightZip}
            ingestedCbsas={ingestedCbsas}
            criteriaMode={criteriaGeographyRestricted}
            onStateSelect={handleStateSelect}
            fitBoundsTarget={stateFitBounds}
          />
          {isOverviewMode && geography === "national" && !exploreMode && (
            <UsMapInsets activeRegion={usInsetRegion} onSelectRegion={handleInsetSelect} />
          )}
          {photoHeroEnabled && (
            <NeighborhoodPhotoHero
              photo={neighborhoodPhoto}
              visible={photoHeroVisible}
              zip={photoHeroZip ?? undefined}
              neighborhood={selected?.name}
            />
          )}
          <Google3DTilesBadge status={tilesStatus} />
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
        title={contextChip?.title ?? overviewTopBarChip?.title ?? "Details"}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </StoryDrawer>
    </>
  );
}
