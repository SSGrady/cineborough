"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { MVTLayer } from "@deck.gl/geo-layers";
import type { PickingInfo, Layer } from "@deck.gl/core";
import type { DcMetroGeoJson, MetricLayerKey, MetroGeometry } from "@cineborough/data";
import {
  getChoroplethSpecFromGeoJson,
  getRawMetricFromFeature,
  loadTransitPaths,
  loadAmenityPois,
  type AmenityCategory,
  METRIC_LAYERS,
  getMetroTileConfig,
  METRIC_PROVENANCE,
  metricSourceDetail,
  sandboxCbsaForCounty,
} from "@cineborough/data";
import {
  colorForChoropleth,
  choroplethPaletteForMetric,
  darkenRgb,
  US_NATIONAL_CAMERA,
  US_CONTINENTAL_BOUNDS,
  US_FULL_BOUNDS,
  US_MAP_PROJECTION,
  US_NATIONAL_FIT_PADDING,
  centroidFromGeoJsonGeometry,
  isFiniteLngLat,
  isValidCameraTarget,
  sanitizeLngLatPath,
  type MapCameraTarget,
} from "@cineborough/geo";
import type { GeographyLevel } from "@cineborough/geo";
import { formatCurrency, formatPercent } from "@/lib/format";
import { BottomBar } from "./BottomBar";
import { extractOuterRings, ringToPath } from "@/lib/selection-border";
import { truncateLinePath } from "@/lib/path-trace";
import { createPmtilesFetch } from "@/lib/pmtiles-fetch";
import { createGoogle3DTilesLayer } from "@/lib/google-3d-tiles";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const METRO_TILES_URL = process.env.NEXT_PUBLIC_METRO_TILES_URL ?? null;
const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";

const AMENITY_COLORS: Record<AmenityCategory, [number, number, number, number]> = {
  park: [34, 197, 94, 230],
  transit: [59, 130, 246, 230],
  coffee: [245, 158, 11, 230],
  trail: [16, 185, 129, 220],
};

interface MapViewProps {
  geoJson: DcMetroGeoJson;
  activeMetric?: MetricLayerKey;
  selectedZip?: string | null;
  onZipSelect?: (zipCode: string | null) => void;
  /** Fired when the user clicks map background (no feature hit). */
  onBackgroundClick?: () => void;
  cameraTarget?: MapCameraTarget | null;
  /** jumpTo each frame (scroll scrub) — avoids deck.gl drift during flyTo */
  cameraInstant?: boolean;
  pathVisible?: boolean;
  labelsVisible?: boolean;
  exploreMode?: boolean;
  onToggleExploreMode?: () => void;
  onUserMapMove?: () => void;
  /** Retains continental overview center/zoom for cinematic exit restore */
  onOverviewCameraCapture?: (camera: MapCameraTarget) => void;
  /** Current map bounds for geographic ranking funnel (overview / discovery). */
  onViewportBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
  mapBounds?: [[number, number], [number, number]] | null;
  geographyLevel?: GeographyLevel;
  /** Flat continental overview — national/state/metro/county tabs */
  overviewMode?: boolean;
  fitNationalBounds?: boolean;
  /** When false, map clicks do not tilt/fly the camera (overview regions) */
  cinematicOnSelect?: boolean;
  /** Hide animated selection border (e.g. during discovery flyover) */
  selectionBorderVisible?: boolean;
  /** ZIP whose amenity POIs glow during discovery highlight */
  amenityHighlightZip?: string | null;
  /** 0–1 trace-in progress for route paths (1 = full path) */
  pathTraceProgress?: number;
  /** Limit transit paths to a ZIP (discovery flyover) */
  pathFilterZip?: string | null;
  enable3DTiles?: boolean;
  /** Discovery flyover or scroll story — larger, centered ZIP labels */
  cinematicTourActive?: boolean;
  /** When set, only this ZIP gets a map label (flyover / story focus) */
  labelHighlightZip?: string | null;
  /** CBSAs with ingested neighborhood shards — highlighted in overview metro view */
  ingestedCbsas?: ReadonlySet<string>;
  /** Criteria/discovery mode — metric-matched hover highlight on polygons */
  criteriaMode?: boolean;
  /** State overview click — fit bounds and switch to metro tab */
  onStateSelect?: (stateAbbr: string) => void;
  /** One-shot fitBounds trigger (e.g. state click) */
  fitBoundsTarget?: { bounds: [[number, number], [number, number]]; token: number } | null;
}

const CRITERIA_HOVER_FILL_ALPHA = 200;
const CRITERIA_HOVER_BORDER_DARKEN = 0.18;
const CRITERIA_HOVER_FALLBACK_RGB: [number, number, number] = [148, 163, 184];

function baseChoroplethRgb(
  featureId: string,
  colorByZip: Map<string, number>,
  choroplethPalette: ReturnType<typeof choroplethPaletteForMetric>,
): [number, number, number] {
  const score = colorByZip.get(featureId) ?? 0;
  const hex = colorForChoropleth(choroplethPalette, score);
  const [r, g, b] = hexToRgb(hex);
  return [r, g, b];
}

interface LabelPoint {
  position: [number, number];
  zipCode: string;
  name: string;
  value: number;
}

/** Zoom at which metric values appear beneath metro names (Reventure-style two-line labels). */
const METRO_VALUE_LABEL_MIN_ZOOM = 5.75;
const MIN_COUNTY_LABEL_ZOOM = 5.5;
const MIN_COUNTY_VALUE_LABEL_ZOOM = 6.5;

function ringAreaSqDeg(ring: number[][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}

function metroGeometryArea(geometry: MetroGeometry): number {
  if (geometry.type === "Polygon") return ringAreaSqDeg(geometry.coordinates[0]);
  return geometry.coordinates.reduce((sum, polygon) => sum + ringAreaSqDeg(polygon[0]), 0);
}

/** Smallest zoom at which a metro polygon earns a label (area in sq degrees). */
function minMetroLabelZoom(areaSqDeg: number): number {
  if (areaSqDeg < 0.12) return 8;
  if (areaSqDeg < 0.25) return 7.5;
  if (areaSqDeg < 0.4) return 7;
  if (areaSqDeg < 0.55) return 7;
  if (areaSqDeg < 0.85) return 6;
  if (areaSqDeg < 1.2) return 5.5;
  return 5;
}

/** Label budget by zoom — bird's-eye shows largest metros only; mid-zoom densifies. */
function maxMetroLabelsForZoom(zoom: number): number {
  if (zoom < 5) return 0;
  if (zoom < 5.5) return 12;
  if (zoom < 6) return 150;
  if (zoom < 6.5) return 220;
  if (zoom < 7) return 280;
  if (zoom < 8) return 400;
  return Number.POSITIVE_INFINITY;
}

function buildMetroLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
  mapZoom: number,
  minHomeValue = 1,
): LabelPoint[] {
  const cap = maxMetroLabelsForZoom(mapZoom);
  if (cap === 0) return [];

  const candidates = geoJson.features
    .filter((f) => f.properties.medianHomeValue >= minHomeValue)
    .flatMap((f) => {
      const area = metroGeometryArea(f.geometry);
      if (mapZoom < minMetroLabelZoom(area)) return [];
      const point = featureToLabelPoint(f, activeMetric);
      return point ? [{ point, area }] : [];
    });

  if (!Number.isFinite(cap)) return candidates.map(({ point }) => point);

  return candidates
    .sort((a, b) => b.area - a.area)
    .slice(0, cap)
    .map(({ point }) => point);
}

function buildStateLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): LabelPoint[] {
  return geoJson.features
    .map((f) => featureToLabelPoint(f, activeMetric))
    .filter((point): point is LabelPoint => point !== null);
}

function buildCountyLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
  mapZoom: number,
): LabelPoint[] {
  if (mapZoom < MIN_COUNTY_LABEL_ZOOM) return [];

  const cap =
    mapZoom < 7 ? 40 : mapZoom < 8 ? 120 : mapZoom < 9 ? 280 : Number.POSITIVE_INFINITY;

  const candidates = geoJson.features
    .filter((f) => f.properties.medianHomeValue > 0)
    .map((f) => {
      const area = metroGeometryArea(f.geometry);
      const point = featureToLabelPoint(f, activeMetric);
      return point ? { point, area } : null;
    })
    .filter((entry): entry is { point: LabelPoint; area: number } => entry !== null);

  if (!Number.isFinite(cap)) return candidates.map(({ point }) => point);

  return candidates
    .sort((a, b) => b.area - a.area)
    .slice(0, cap)
    .map(({ point }) => point);
}

function buildNationalLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): LabelPoint[] {
  const sample = geoJson.features[0];
  if (sample) {
    return [
      {
        position: [-96.5, 39.2] as [number, number],
        zipCode: "US",
        name: "United States",
        value: getRawMetricFromFeature(sample.properties, activeMetric),
      },
    ];
  }
  return [];
}

function hexToRgb(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 200];
}

function formatLabelValue(key: MetricLayerKey, value: number): string {
  const layer = METRIC_LAYERS.find((m) => m.key === key);
  if (!layer) return String(value);
  if (layer.unit === "$") return formatCurrency(value);
  if (layer.unit === "%") return formatPercent(value, 1);
  if (layer.unit === "days") return `${Math.round(value)}d`;
  if (layer.unit === "$/sqft") return `$${value}`;
  if (layer.unit === "0–100") return `${Math.round(value)}`;
  return value.toFixed(1);
}

function isValidLabelPosition(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat);
}

function labelPositionForFeature(
  feature: DcMetroGeoJson["features"][number],
): [number, number] | null {
  const { labelLng, labelLat } = feature.properties;
  if (isValidLabelPosition(labelLng, labelLat)) {
    return [labelLng, labelLat];
  }
  const centroid = centroidFromGeoJsonGeometry(feature.geometry);
  return centroid && isFiniteLngLat(centroid) ? centroid : null;
}

function featureToLabelPoint(
  feature: DcMetroGeoJson["features"][number],
  activeMetric: MetricLayerKey,
): LabelPoint | null {
  const position = labelPositionForFeature(feature);
  if (!position) return null;
  const { zipCode, neighborhoodName } = feature.properties;
  return {
    position,
    zipCode,
    name: neighborhoodName,
    value: getRawMetricFromFeature(feature.properties, activeMetric),
  };
}

function cameraKey(target: MapCameraTarget): string | null {
  if (!isValidCameraTarget(target)) return null;
  const [lng, lat] = target.center;
  return `${lng.toFixed(5)},${lat.toFixed(5)},${target.zoom.toFixed(3)},${target.pitch ?? 0},${target.bearing ?? 0}`;
}

function applyCamera(
  map: mapboxgl.Map,
  target: MapCameraTarget,
  instant: boolean,
  programmaticRef: { current: boolean },
) {
  if (!isValidCameraTarget(target)) return;
  programmaticRef.current = true;
  const opts = {
    center: target.center,
    zoom: target.zoom,
    pitch: target.pitch ?? 0,
    bearing: target.bearing ?? 0,
  };

  if (instant || target.duration === 0) {
    map.jumpTo(opts);
  } else {
    map.stop();
    map.easeTo({ ...opts, duration: target.duration ?? 800 });
  }
}

export function MapView({
  geoJson,
  activeMetric = "medianHomeValue",
  selectedZip = null,
  onZipSelect,
  onBackgroundClick,
  cameraTarget = null,
  cameraInstant = false,
  pathVisible = false,
  labelsVisible = true,
  exploreMode = false,
  onToggleExploreMode,
  onUserMapMove,
  onOverviewCameraCapture,
  onViewportBoundsChange,
  mapBounds = US_CONTINENTAL_BOUNDS,
  geographyLevel = "metro",
  overviewMode = false,
  fitNationalBounds = false,
  cinematicOnSelect = true,
  selectionBorderVisible = true,
  amenityHighlightZip = null,
  pathTraceProgress = 1,
  pathFilterZip = null,
  enable3DTiles = false,
  cinematicTourActive = false,
  labelHighlightZip = null,
  ingestedCbsas,
  criteriaMode = false,
  onStateSelect,
  fitBoundsTarget = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const lastCameraKeyRef = useRef<string | null>(null);
  const programmaticMoveRef = useRef(false);
  const exploreModeRef = useRef(exploreMode);
  const overviewModeRef = useRef(overviewMode);
  const onUserMapMoveRef = useRef(onUserMapMove);
  const onOverviewCameraCaptureRef = useRef(onOverviewCameraCapture);
  const onViewportBoundsChangeRef = useRef(onViewportBoundsChange);
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(US_NATIONAL_CAMERA.zoom);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);

  exploreModeRef.current = exploreMode;
  overviewModeRef.current = overviewMode;
  onUserMapMoveRef.current = onUserMapMove;
  onOverviewCameraCaptureRef.current = onOverviewCameraCapture;
  onViewportBoundsChangeRef.current = onViewportBoundsChange;

  const isOverviewView = overviewMode;
  const cameraTargetKey = cameraTarget ? cameraKey(cameraTarget) : null;
  const metroTileConfig = useMemo(
    () => (isOverviewView ? getMetroTileConfig(METRO_TILES_URL) : null),
    [isOverviewView],
  );
  // Overview uses in-memory GeoJSON (945 CBSAs) for metric-aware choropleth fills.
  // MVT tiles bake opportunity-score colors only and were not rendering polygon fills.
  const useMetroTiles = false;

  const metricLabel =
    METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "Median Home Price";

  const choroplethPalette = choroplethPaletteForMetric(activeMetric);
  const isNationalGeography = overviewMode && geographyLevel === "national";
  const isStateGeography = overviewMode && geographyLevel === "state";
  const isCountyGeography = overviewMode && geographyLevel === "county";

  /**
   * Metric-matched hover — criteria/discovery and data-layers overview (metro/state/county/zip).
   * Off for national tab and during flyover/story.
   */
  const choroplethHoverActive =
    !cinematicTourActive &&
    geographyLevel !== "national" &&
    (criteriaMode ||
      (isOverviewView &&
        (geographyLevel === "metro" ||
          geographyLevel === "state" ||
          geographyLevel === "county" ||
          geographyLevel === "zip")));

  useEffect(() => {
    if (!choroplethHoverActive) {
      setHoveredZip(null);
    }
  }, [choroplethHoverActive]);

  const choroplethSpec = useMemo(
    () => getChoroplethSpecFromGeoJson(geoJson, activeMetric),
    [geoJson, activeMetric],
  );
  const colorByZip = choroplethSpec.colorByZip;

  /** O(1) feature id → base choropleth RGB; rebuilt when geoJson or metric changes (lazy shards). */
  const choroplethRgbByFeatureId = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const feature of geoJson.features) {
      const featureId = feature.properties.zipCode;
      if (!featureId) continue;
      map.set(
        featureId,
        baseChoroplethRgb(featureId, colorByZip, choroplethPalette),
      );
    }
    return map;
  }, [geoJson, colorByZip, choroplethPalette]);

  const legendValueRange = useMemo(() => {
    const values = geoJson.features.map((f) =>
      getRawMetricFromFeature(f.properties, activeMetric),
    );
    if (values.length === 0) {
      return { min: undefined, max: undefined, tercile: undefined };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bounds = choroplethSpec.tercileBounds;
    return {
      min: formatLabelValue(activeMetric, min),
      max: formatLabelValue(activeMetric, max),
      tercile: bounds
            ? {
                low: `≤ ${formatLabelValue(activeMetric, bounds.p33)}`,
                mid: `${formatLabelValue(activeMetric, bounds.p33)} – ${formatLabelValue(activeMetric, bounds.p66)}`,
                high: `≥ ${formatLabelValue(activeMetric, bounds.p66)}`,
              }
            : undefined,
    };
  }, [geoJson, activeMetric, choroplethSpec.tercileBounds]);

  const labelData = useMemo((): LabelPoint[] => {
    if (!overviewMode) {
      return geoJson.features
        .map((f) => featureToLabelPoint(f, activeMetric))
        .filter((point): point is LabelPoint => point !== null);
    }
    if (geographyLevel === "national") {
      return buildNationalLabelData(geoJson, activeMetric);
    }
    if (geographyLevel === "state") {
      return buildStateLabelData(geoJson, activeMetric);
    }
    if (geographyLevel === "county") {
      return buildCountyLabelData(geoJson, activeMetric, mapZoom);
    }
    return buildMetroLabelData(geoJson, activeMetric, mapZoom);
  }, [geoJson, activeMetric, overviewMode, geographyLevel, mapZoom]);

  const selectionRings = useMemo(
    () =>
      selectedZip && selectionBorderVisible && !isOverviewView
        ? extractOuterRings(geoJson, selectedZip)
        : [],
    [geoJson, selectedZip, selectionBorderVisible, isOverviewView],
  );

  const choroplethLayer = useMemo(() => {
    return new GeoJsonLayer({
      id: "zip-choropleth",
      data: geoJson,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      wireframe: false,
      getFillColor: (feature) => {
        const props = feature?.properties as Record<string, unknown> | undefined;
        const zip = props?.zipCode as string | undefined;
        const isSelected = zip === selectedZip;
        const isHovered = choroplethHoverActive && zip === hoveredZip;
        if (isHovered) {
          const rgb = zip ? choroplethRgbByFeatureId.get(zip) : undefined;
          const [r, g, b] = rgb ?? CRITERIA_HOVER_FALLBACK_RGB;
          return [r, g, b, CRITERIA_HOVER_FILL_ALPHA];
        }

        const rgb = zip ? choroplethRgbByFeatureId.get(zip) : undefined;
        const [r, g, b] = rgb ?? CRITERIA_HOVER_FALLBACK_RGB;
        const fillAlpha = isNationalGeography
          ? 200
          : isStateGeography
            ? 210
            : isCountyGeography
              ? 195
              : isOverviewView
                ? 120
                : 75;
        return [r, g, b, isSelected ? 185 : fillAlpha];
      },
      getLineColor: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        const isHovered = choroplethHoverActive && zip === hoveredZip;
        if (isHovered) {
          const rgb = zip ? choroplethRgbByFeatureId.get(zip) : undefined;
          const base = rgb ?? CRITERIA_HOVER_FALLBACK_RGB;
          const [r, g, b] = darkenRgb(base, CRITERIA_HOVER_BORDER_DARKEN);
          return [r, g, b, 255];
        }
        if (zip === selectedZip) return [255, 255, 255, 255];
        if (isNationalGeography) return [255, 255, 255, 60];
        if (isStateGeography || isCountyGeography) return [15, 23, 42, 200];
        if (isOverviewView && geographyLevel === "metro" && ingestedCbsas?.has(zip ?? "")) {
          return [34, 197, 94, 240];
        }
        return isOverviewView ? [15, 23, 42, 220] : [30, 41, 59, 160];
      },
      getLineWidth: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        const isHovered = choroplethHoverActive && zip === hoveredZip;
        if (isHovered) return 2;
        if (zip === selectedZip) return 2.5;
        if (isNationalGeography) return 0.5;
        if (isStateGeography || isCountyGeography) return 1.1;
        return isOverviewView ? 1.1 : 0.75;
      },
      lineWidthMinPixels: isNationalGeography ? 0.35 : isOverviewView ? 0.85 : 0.5,
      lineWidthMaxPixels: isOverviewView ? 2.5 : 1.5,
      updateTriggers: {
        getFillColor: [choroplethRgbByFeatureId, selectedZip, activeMetric, isOverviewView, geographyLevel, choroplethHoverActive, hoveredZip],
        getLineColor: [choroplethRgbByFeatureId, selectedZip, isOverviewView, geographyLevel, ingestedCbsas, choroplethHoverActive, hoveredZip],
        getLineWidth: [selectedZip, isOverviewView, geographyLevel, choroplethHoverActive, hoveredZip],
      },
    });
  }, [geoJson, choroplethRgbByFeatureId, selectedZip, activeMetric, isOverviewView, geographyLevel, isNationalGeography, isStateGeography, isCountyGeography, ingestedCbsas, choroplethHoverActive, hoveredZip]);

  const metroMvtLayer = useMemo(() => {
    if (!useMetroTiles || !metroTileConfig) return null;

    const fetch = createPmtilesFetch(metroTileConfig.url);

    return new MVTLayer({
      id: "metro-mvt",
      data: [`pmtiles://${metroTileConfig.url}/{z}/{x}/{y}.mvt`],
      minZoom: 3,
      maxZoom: metroTileConfig.maxZoom,
      pickable: true,
      filled: true,
      stroked: true,
      binary: false,
      uniqueIdProperty: "GEOID",
      fetch,
      getFillColor: (feature) => {
        const props = feature?.properties as Record<string, string | number> | undefined;
        const zip = props?.zipCode as string | undefined;
        const isSelected = zip === selectedZip;
        const r = Number(props?.fillR ?? 148);
        const g = Number(props?.fillG ?? 163);
        const b = Number(props?.fillB ?? 184);
        const alpha = isSelected ? 150 : 85;
        return [r, g, b, alpha];
      },
      getLineColor: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        if (zip === selectedZip) return [255, 255, 255, 110];
        return [30, 41, 59, 180];
      },
      getLineWidth: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        return zip === selectedZip ? 1.25 : 1;
      },
      lineWidthMinPixels: 0.75,
      lineWidthMaxPixels: 2,
      updateTriggers: {
        getFillColor: [selectedZip, isOverviewView],
        getLineColor: [selectedZip],
        getLineWidth: [selectedZip],
      },
    });
  }, [useMetroTiles, metroTileConfig, selectedZip, isOverviewView]);

  const selectionBorderLayers = useMemo(() => {
    if (
      !selectedZip ||
      selectionRings.length === 0 ||
      !selectionBorderVisible ||
      isOverviewView
    ) {
      return [];
    }

    const outlineData = selectionRings
      .map(({ ring, regionId }) => ({ path: ringToPath(ring), regionId }))
      .filter(({ path }) => path.length >= 2);

    if (outlineData.length === 0) return [];

    const outline = new PathLayer({
      id: "selection-outline",
      data: outlineData,
      pickable: false,
      getPath: (d) => d.path,
      getColor: [255, 255, 255, 255],
      getWidth: 3,
      widthMinPixels: 2.5,
      widthMaxPixels: 4,
      capRounded: true,
      jointRounded: true,
    });

    return [outline];
  }, [selectedZip, selectionRings, selectionBorderVisible, isOverviewView]);

  const focusZip =
    labelHighlightZip ?? (selectedZip && !isOverviewView ? selectedZip : null);
  const tourLabelOnly = Boolean(labelHighlightZip);

  const visibleLabelData = useMemo((): LabelPoint[] => {
    let data = labelData;

    if (focusZip) {
      data = labelData.map((d) => {
        if (d.zipCode !== focusZip) return d;
        const feature = geoJson.features.find((f) => f.properties.zipCode === focusZip);
        if (!feature) return d;
        const position = labelPositionForFeature(feature);
        return position ? { ...d, position } : d;
      });
    }

    if (tourLabelOnly && labelHighlightZip) {
      return data.filter((d) => d.zipCode === labelHighlightZip);
    }

    return data;
  }, [labelData, focusZip, tourLabelOnly, labelHighlightZip, geoJson]);

  const labelLayers = useMemo((): Layer[] => {
    if (!labelsVisible || visibleLabelData.length === 0) return [];

    const overview = isOverviewView;
    const attachedLabels = Boolean(focusZip) && !overview;
    const cinematicLabels = (cinematicTourActive || attachedLabels) && !overview;
    const isMetroOverview = overview && geographyLevel === "metro";
    const isCountyOverview = overview && geographyLevel === "county";
    const showMetroValues = !isMetroOverview || mapZoom >= METRO_VALUE_LABEL_MIN_ZOOM;
    const showCountyValues = !isCountyOverview || mapZoom >= MIN_COUNTY_VALUE_LABEL_ZOOM;
    const showMetricValues = showMetroValues && showCountyValues;
    const nameSize = overview
      ? geographyLevel === "national"
        ? 18
        : geographyLevel === "state" || geographyLevel === "county"
          ? 13
          : mapZoom < 7
            ? 12
            : 13
      : cinematicLabels
        ? 15
        : mapZoom < 6
          ? 11
          : 13;
    const valueSize = cinematicLabels ? Math.max(12, nameSize - 1) : Math.max(10, nameSize - 1);
    const lineGap = Math.round(nameSize * (cinematicLabels ? 0.65 : 0.72));
    const outlineWidth = cinematicLabels ? 5 : overview ? 4 : 3;

    const labelColor = (
      d: LabelPoint,
      focused: [number, number, number, number],
      dimmed: [number, number, number, number],
      normal: [number, number, number, number],
    ): [number, number, number, number] => {
      if (!focusZip) return normal;
      return d.zipCode === focusZip ? focused : dimmed;
    };

    const isAttachedZip = (d: LabelPoint) => attachedLabels && d.zipCode === focusZip;

    const shared = {
      data: visibleLabelData,
      pickable: false,
      getPosition: (d: LabelPoint) => d.position,
      getTextAnchor: "middle" as const,
      billboard: true,
      sizeUnits: "pixels" as const,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontWeight: 700,
      outlineWidth,
      outlineColor: [255, 255, 255, 250] as [number, number, number, number],
      characterSet: "auto" as const,
    };

    const nameLayer = new TextLayer({
      ...shared,
      id: overview ? "overview-labels-name" : "zip-labels-name",
      getText: (d: LabelPoint) => d.name,
      getSize: (d: LabelPoint) => (isAttachedZip(d) ? nameSize + 1 : nameSize),
      getColor: (d: LabelPoint) =>
        labelColor(
          d,
          cinematicLabels ? [255, 255, 255, 255] : [15, 23, 42, 255],
          cinematicLabels ? [255, 255, 255, 130] : [15, 23, 42, 85],
          cinematicLabels ? [255, 255, 255, 255] : [15, 23, 42, 255],
        ),
      getAlignmentBaseline: (d: LabelPoint) =>
        isAttachedZip(d) ? "bottom" : "center",
      getPixelOffset: (d: LabelPoint) =>
        isAttachedZip(d)
          ? ([0, -Math.round(lineGap / 2)] as [number, number])
          : ([0, showMetricValues ? -lineGap / 2 : 0] as [number, number]),
      updateTriggers: {
        getSize: [geographyLevel, mapZoom, cinematicTourActive, focusZip],
        getPixelOffset: [nameSize, showMetricValues, cinematicTourActive, focusZip],
        getColor: [cinematicTourActive, focusZip],
        getAlignmentBaseline: [cinematicTourActive, focusZip],
      },
    });

    if (!showMetricValues) return [nameLayer];

    const valueLayer = new TextLayer({
      ...shared,
      id: overview ? "overview-labels-value" : "zip-labels-value",
      getText: (d: LabelPoint) => formatLabelValue(activeMetric, d.value),
      getSize: (d: LabelPoint) => (isAttachedZip(d) ? valueSize + 1 : valueSize),
      getColor: (d: LabelPoint) =>
        labelColor(
          d,
          cinematicLabels ? [255, 255, 255, 255] : [15, 23, 42, 255],
          cinematicLabels ? [255, 255, 255, 130] : [15, 23, 42, 85],
          cinematicLabels ? [255, 255, 255, 255] : [15, 23, 42, 255],
        ),
      getAlignmentBaseline: (d: LabelPoint) => (isAttachedZip(d) ? "top" : "center"),
      getPixelOffset: (d: LabelPoint) =>
        isAttachedZip(d)
          ? ([0, Math.round(lineGap / 2)] as [number, number])
          : ([0, lineGap / 2] as [number, number]),
      updateTriggers: {
        getText: [activeMetric],
        getSize: [geographyLevel, mapZoom, activeMetric, cinematicTourActive, focusZip],
        getPixelOffset: [nameSize, cinematicTourActive, focusZip],
        getColor: [cinematicTourActive, focusZip],
        getAlignmentBaseline: [cinematicTourActive, focusZip],
      },
    });

    return [nameLayer, valueLayer];
  }, [
    visibleLabelData,
    activeMetric,
    labelsVisible,
    isOverviewView,
    geographyLevel,
    mapZoom,
    cinematicTourActive,
    focusZip,
  ]);

  const pathLayer = useMemo(() => {
    const collection = loadTransitPaths(pathFilterZip ?? undefined);
    const paths = collection.features.filter(
      (feature) => sanitizeLngLatPath(feature.geometry.coordinates).length >= 2,
    );
    if (paths.length === 0) return null;

    const trace = Math.max(0, Math.min(1, pathTraceProgress));

    return new PathLayer({
      id: "transit-path",
      data: paths,
      pickable: false,
      getPath: (feature) => {
        const full = sanitizeLngLatPath(feature.geometry.coordinates);
        return trace < 1 ? truncateLinePath(full, trace) : full;
      },
      getColor: [34, 197, 94, pathVisible ? 210 : 0],
      getWidth: 5,
      widthMinPixels: 3,
      capRounded: true,
      jointRounded: true,
      updateTriggers: {
        getColor: [pathVisible],
        getPath: [pathTraceProgress, pathFilterZip],
      },
    });
  }, [pathVisible, pathTraceProgress, pathFilterZip]);

  const amenityLayers = useMemo(() => {
    if (!amenityHighlightZip) return [];

    const pois = loadAmenityPois(amenityHighlightZip).filter((f) =>
      isFiniteLngLat(f.geometry.coordinates),
    );
    if (pois.length === 0) return [];

    const glow = new ScatterplotLayer({
      id: "amenity-glow",
      data: pois,
      pickable: false,
      getPosition: (d) => d.geometry.coordinates,
      getRadius: 42,
      radiusMinPixels: 14,
      radiusMaxPixels: 28,
      getFillColor: (d) => {
        const cat = d.properties.category as AmenityCategory;
        const [r, g, b] = AMENITY_COLORS[cat] ?? [148, 163, 184];
        return [r, g, b, 70];
      },
      updateTriggers: { getFillColor: [amenityHighlightZip] },
    });

    const dots = new ScatterplotLayer({
      id: "amenity-dots",
      data: pois,
      pickable: false,
      getPosition: (d) => d.geometry.coordinates,
      getRadius: 16,
      radiusMinPixels: 5,
      radiusMaxPixels: 10,
      getFillColor: (d) => AMENITY_COLORS[d.properties.category as AmenityCategory] ?? [148, 163, 184, 220],
      updateTriggers: { getFillColor: [amenityHighlightZip] },
    });

    return [glow, dots];
  }, [amenityHighlightZip]);

  const google3DTilesLayer = useMemo(() => {
    if (!enable3DTiles) return null;
    return createGoogle3DTilesLayer();
  }, [enable3DTiles]);

  const layers = useMemo(() => {
    const base = useMetroTiles && metroMvtLayer ? metroMvtLayer : choroplethLayer;
    const stack: Layer[] = [base, ...selectionBorderLayers];
    if (google3DTilesLayer) stack.push(google3DTilesLayer);
    if (pathVisible && pathLayer) stack.push(pathLayer);
    stack.push(...amenityLayers);
    stack.push(...labelLayers);
    return stack;
  }, [choroplethLayer, metroMvtLayer, useMetroTiles, selectionBorderLayers, google3DTilesLayer, pathLayer, amenityLayers, labelLayers, pathVisible]);

  const handleHover = useCallback(
    (info: PickingInfo) => {
      if (!choroplethHoverActive) {
        setHoveredZip(null);
        return;
      }
      const zip =
        (info.object?.properties as { zipCode?: string } | undefined)?.zipCode ?? null;
      setHoveredZip(zip);
    },
    [choroplethHoverActive],
  );

  const handleClick = useCallback(
    (info: PickingInfo) => {
      const zip = (info.object?.properties as { zipCode?: string })?.zipCode;

      if (!zip) {
        onBackgroundClick?.();
        return;
      }

      // National/state overview regions are not drill targets
      if (isOverviewView && (zip === "US" || zip.startsWith("US-"))) {
        onBackgroundClick?.();
        return;
      }
      if (isOverviewView && geographyLevel === "state") {
        onStateSelect?.(zip);
        return;
      }
      if (isOverviewView && geographyLevel === "county") {
        if (sandboxCbsaForCounty(zip)) {
          onZipSelect?.(zip);
        }
        return;
      }

      onZipSelect?.(zip);

      const map = mapRef.current;
      if (!map || !cinematicOnSelect) return;

      const feature = geoJson.features.find((f) => f.properties.zipCode === zip);
      const centroid = feature ? labelPositionForFeature(feature) : null;
      const flyCenter =
        centroid ??
        (info.coordinate && isFiniteLngLat([info.coordinate[0], info.coordinate[1]])
          ? ([info.coordinate[0], info.coordinate[1]] as [number, number])
          : null);
      if (!flyCenter) return;

      applyCamera(
        map,
        {
          center: flyCenter,
          zoom: 12.5,
          pitch: exploreModeRef.current ? 0 : 60,
          bearing: exploreModeRef.current ? 0 : -15,
          duration: 800,
        },
        false,
        programmaticMoveRef,
      );
    },
    [onZipSelect, onStateSelect, onBackgroundClick, cinematicOnSelect, isOverviewView, geographyLevel, geoJson],
  );

  const syncOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay || !mapReady) return;
    try {
      overlay.setProps({ layers, onClick: handleClick, onHover: handleHover });
    } catch {
      // Deck.gl rejects non-mercator Mapbox projections
    }
  }, [layers, handleClick, handleHover, mapReady]);

  const applyInteractionMode = useCallback((map: mapboxgl.Map, exploring: boolean) => {
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.touchPitch.enable();
    map.scrollZoom.enable();

    if (exploring) {
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
    } else {
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
    }
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") return;
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialStyle = MAP_STYLE;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: US_NATIONAL_CAMERA.center,
      zoom: US_NATIONAL_CAMERA.zoom,
      pitch: 0,
      bearing: 0,
      projection: US_MAP_PROJECTION,
      dragPan: true,
      touchZoomRotate: true,
      touchPitch: true,
      cooperativeGestures: true,
    });

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const onRender = () => {
      const deck = (overlay as unknown as { _deck?: { redraw: () => void } })._deck;
      deck?.redraw();
    };

    map.on("load", () => {
      map.setProjection(US_MAP_PROJECTION);
      map.setMaxBounds(mapBounds ?? US_CONTINENTAL_BOUNDS);
      applyInteractionMode(map, exploreModeRef.current);
      map.on("render", onRender);
      setMapReady(true);
    });

    const onUserGestureEnd = () => {
      if (!programmaticMoveRef.current && onUserMapMoveRef.current) {
        onUserMapMoveRef.current();
      }
      if (overviewModeRef.current && onViewportBoundsChangeRef.current) {
        const bounds = map.getBounds();
        if (bounds) {
          onViewportBoundsChangeRef.current([
            [bounds.getWest(), bounds.getSouth()],
            [bounds.getEast(), bounds.getNorth()],
          ]);
        }
      }
    };

    const onZoom = () => {
      setMapZoom(map.getZoom());
    };

    const onZoomEnd = () => {
      setMapZoom(map.getZoom());
      if (!programmaticMoveRef.current) onUserGestureEnd();
    };

    const onMoveEnd = () => {
      programmaticMoveRef.current = false;
    };

    map.on("dragend", onUserGestureEnd);
    map.on("zoom", onZoom);
    map.on("zoomend", onZoomEnd);
    map.on("moveend", onMoveEnd);

    const onWheel = (e: WheelEvent) => {
      if (exploreModeRef.current) return;
      if (e.ctrlKey || e.metaKey) return;
      window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "auto" });
    };

    const canvas = map.getCanvas();
    canvas.addEventListener("wheel", onWheel, { passive: true });

    map.addControl(overlay);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      map.off("render", onRender);
      map.off("dragend", onUserGestureEnd);
      map.off("zoom", onZoom);
      map.off("zoomend", onZoomEnd);
      map.off("moveend", onMoveEnd);
      try {
        overlay.setProps({ layers: [] });
      } catch {
        // ignore teardown errors when projection is incompatible
      }
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    syncOverlay();
  }, [syncOverlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyInteractionMode(map, exploreMode);
  }, [exploreMode, mapReady, applyInteractionMode]);

  const prevNationalFitRef = useRef(false);
  const prevFitBoundsTokenRef = useRef<number | null>(null);

  const captureOverviewCamera = useCallback((map: mapboxgl.Map) => {
    if (!overviewMode || exploreModeRef.current) return;
    const pitch = map.getPitch();
    const bearing = map.getBearing();
    if (pitch > 1 || Math.abs(bearing) > 1) return;
    const lng = map.getCenter().lng;
    const lat = map.getCenter().lat;
    const zoom = map.getZoom();
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(zoom)) return;
    onOverviewCameraCaptureRef.current?.({
      center: [lng, lat],
      zoom,
      pitch: 0,
      bearing: 0,
    });
  }, [overviewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || exploreMode || !fitBoundsTarget) return;
    if (prevFitBoundsTokenRef.current === fitBoundsTarget.token) return;
    prevFitBoundsTokenRef.current = fitBoundsTarget.token;

    programmaticMoveRef.current = true;
    map.fitBounds(fitBoundsTarget.bounds, {
      padding: US_NATIONAL_FIT_PADDING,
      pitch: 0,
      bearing: 0,
      duration: 800,
    });
    map.once("moveend", () => captureOverviewCamera(map));
  }, [fitBoundsTarget, mapReady, exploreMode, captureOverviewCamera]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || exploreMode) return;

    if (fitNationalBounds && !prevNationalFitRef.current) {
      programmaticMoveRef.current = true;
      map.fitBounds(US_CONTINENTAL_BOUNDS, {
        padding: US_NATIONAL_FIT_PADDING,
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
      map.once("moveend", () => captureOverviewCamera(map));
    }
    prevNationalFitRef.current = fitNationalBounds;
  }, [fitNationalBounds, mapReady, exploreMode, captureOverviewCamera]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraTarget || !mapReady || exploreMode) return;
    if (fitNationalBounds) return;
    if (!isValidCameraTarget(cameraTarget)) return;

    const key = cameraKey(cameraTarget);
    if (!key || lastCameraKeyRef.current === key) return;
    lastCameraKeyRef.current = key;

    applyCamera(map, cameraTarget, cameraInstant, programmaticMoveRef);
  }, [cameraTarget, mapReady, exploreMode, cameraInstant, fitNationalBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setMaxBounds(mapBounds ?? US_FULL_BOUNDS);
  }, [mapBounds, mapReady]);

  useEffect(() => {
    if (exploreMode) {
      lastCameraKeyRef.current = null;
    }
  }, [exploreMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !overviewMode) return;

    captureOverviewCamera(map);
    const onMoveEnd = () => captureOverviewCamera(map);
    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [overviewMode, mapReady, captureOverviewCamera]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !tooltipsEnabled) return;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "map-tooltip",
    });

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const pick = overlay.pickObject({ x: e.point.x, y: e.point.y, radius: 4 });
      const props = pick?.object?.properties as
        | { zipCode?: string; neighborhoodName?: string; name?: string }
        | undefined;
      if (props?.zipCode) {
        const value = labelData.find((d) => d.zipCode === props.zipCode);
        const title = props.neighborhoodName ?? props.name ?? props.zipCode;
        const source = METRIC_PROVENANCE[activeMetric];
        const sourceDetail = metricSourceDetail(activeMetric);
        const mockNote =
          source.provenance === "mock"
            ? `<br/><em class="map-tooltip__mock">${source.shortLabel}</em>`
            : `<br/><em class="map-tooltip__verified">${sourceDetail}</em>`;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${title ?? props.zipCode}</strong><br/>${value ? formatLabelValue(activeMetric, value.value) : ""}${mockNote}`,
          )
          .addTo(map);
      } else {
        popup.remove();
      }
    };

    map.on("mousemove", onMouseMove);
    return () => {
      map.off("mousemove", onMouseMove);
      popup.remove();
    };
  }, [mapReady, tooltipsEnabled, labelData, activeMetric, isOverviewView]);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") {
    return (
      <div className="map-placeholder">
        <p>Set NEXT_PUBLIC_MAPBOX_TOKEN in apps/web/.env.local to enable the map.</p>
        <p className="map-placeholder__hint">Get a token at https://account.mapbox.com/access-tokens/</p>
      </div>
    );
  }

  return (
    <div className={`map-view${exploreMode ? " map-view--explore" : ""}`}>
      <div ref={containerRef} className="map-view__canvas" />
      {mapReady && (
        <BottomBar
          activeMetric={activeMetric}
          metricLabel={metricLabel}
          valueMin={legendValueRange.min}
          valueMax={legendValueRange.max}
          tercileBounds={legendValueRange.tercile}
          tooltipsEnabled={tooltipsEnabled}
          onToggleTooltips={() => setTooltipsEnabled((v) => !v)}
          exploreMode={exploreMode}
          onToggleExploreMode={onToggleExploreMode}
        />
      )}
    </div>
  );
}
