"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { MVTLayer } from "@deck.gl/geo-layers";
import type { PickingInfo, Layer } from "@deck.gl/core";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
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
} from "@cineborough/data";
import {
  colorForChoropleth,
  choroplethPaletteForMetric,
  US_NATIONAL_CAMERA,
  US_CONTINENTAL_BOUNDS,
  US_FULL_BOUNDS,
  US_MAP_PROJECTION,
  US_NATIONAL_FIT_PADDING,
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
}

interface LabelPoint {
  position: [number, number];
  zipCode: string;
  name: string;
  value: number;
}

/** Hide metro labels at bird's-eye zoom — shapes only until user zooms in. */
function maxMetroLabelsForZoom(zoom: number): number {
  if (zoom < 5.5) return 0;
  if (zoom < 6) return 24;
  if (zoom < 7) return 60;
  if (zoom < 8) return 140;
  return Number.POSITIVE_INFINITY;
}

function buildMetroLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
  mapZoom: number,
  minHomeValue = 1,
): LabelPoint[] {
  const cap = maxMetroLabelsForZoom(mapZoom);
  const candidates = geoJson.features
    .filter((f) => f.properties.medianHomeValue >= minHomeValue)
    .map((f) => ({
      position: [f.properties.labelLng, f.properties.labelLat] as [number, number],
      zipCode: f.properties.zipCode,
      name: f.properties.neighborhoodName,
      value: getRawMetricFromFeature(f.properties, activeMetric),
      medianHomeValue: f.properties.medianHomeValue,
    }));

  if (!Number.isFinite(cap)) return candidates;

  return candidates
    .sort((a, b) => b.medianHomeValue - a.medianHomeValue)
    .slice(0, cap);
}

function buildStateLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): LabelPoint[] {
  return geoJson.features.map((f) => ({
    position: [f.properties.labelLng, f.properties.labelLat] as [number, number],
    zipCode: f.properties.zipCode,
    name: f.properties.neighborhoodName,
    value: getRawMetricFromFeature(f.properties, activeMetric),
  }));
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
  mapBounds = US_CONTINENTAL_BOUNDS,
  geographyLevel = "metro",
  overviewMode = false,
  fitNationalBounds = false,
  cinematicOnSelect = true,
  selectionBorderVisible = true,
  amenityHighlightZip = null,
  pathTraceProgress = 1,
  pathFilterZip = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const lastCameraKeyRef = useRef<string | null>(null);
  const programmaticMoveRef = useRef(false);
  const exploreModeRef = useRef(exploreMode);
  const onUserMapMoveRef = useRef(onUserMapMove);
  const onOverviewCameraCaptureRef = useRef(onOverviewCameraCapture);
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(US_NATIONAL_CAMERA.zoom);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [selectionPathReady, setSelectionPathReady] = useState(false);

  exploreModeRef.current = exploreMode;
  onUserMapMoveRef.current = onUserMapMove;
  onOverviewCameraCaptureRef.current = onOverviewCameraCapture;

  const isOverviewView = overviewMode;
  const metroTileConfig = useMemo(
    () => (isOverviewView ? getMetroTileConfig(METRO_TILES_URL) : null),
    [isOverviewView],
  );
  // Overview uses in-memory GeoJSON (945 CBSAs) for metric-aware choropleth fills.
  // MVT tiles bake opportunity-score colors only and were not rendering polygon fills.
  const useMetroTiles = false;

  const metricLabel =
    METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "Home Value";

  const choroplethPalette = choroplethPaletteForMetric(activeMetric);
  const isNationalGeography = overviewMode && geographyLevel === "national";
  const isStateGeography = overviewMode && geographyLevel === "state";

  const choroplethSpec = useMemo(
    () => getChoroplethSpecFromGeoJson(geoJson, activeMetric),
    [geoJson, activeMetric],
  );
  const colorByZip = choroplethSpec.colorByZip;

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
        ? activeMetric === "medianHomeValue"
          ? {
              low: `< ${formatLabelValue(activeMetric, bounds.p33)} — More affordable`,
              mid: `${formatLabelValue(activeMetric, bounds.p33)} – ${formatLabelValue(activeMetric, bounds.p66)}`,
              high: `> ${formatLabelValue(activeMetric, bounds.p66)} — Higher cost`,
            }
          : {
              low: `≤ ${formatLabelValue(activeMetric, bounds.p33)}`,
              mid: `${formatLabelValue(activeMetric, bounds.p33)} – ${formatLabelValue(activeMetric, bounds.p66)}`,
              high: `≥ ${formatLabelValue(activeMetric, bounds.p66)}`,
            }
        : undefined,
    };
  }, [geoJson, activeMetric, choroplethSpec.tercileBounds]);

  const labelData = useMemo((): LabelPoint[] => {
    if (!overviewMode) {
      return geoJson.features.map((f) => ({
        position: [f.properties.labelLng, f.properties.labelLat] as [number, number],
        zipCode: f.properties.zipCode,
        name: f.properties.neighborhoodName,
        value: getRawMetricFromFeature(f.properties, activeMetric),
      }));
    }
    if (geographyLevel === "national") {
      return buildNationalLabelData(geoJson, activeMetric);
    }
    if (geographyLevel === "state") {
      return buildStateLabelData(geoJson, activeMetric);
    }
    if (geographyLevel === "county") {
      return buildMetroLabelData(geoJson, activeMetric, mapZoom);
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
        const alpha = isSelected ? 150 : isOverviewView ? 85 : 75;

        // Baked fillColorRgb is opportunity-score only; other metrics use runtime choropleth.
        if (!isOverviewView && activeMetric === "opportunityScore" && props?.fillColorRgb) {
          const rgb = props.fillColorRgb as [number, number, number];
          return [...rgb, alpha];
        }

        const score = zip ? (colorByZip.get(zip) ?? 0) : 0;
        const hex = colorForChoropleth(choroplethPalette, score);
        const [r, g, b] = hexToRgb(hex);
        const fillAlpha = isNationalGeography ? 200 : isStateGeography ? 210 : isOverviewView ? 120 : 75;
        return [r, g, b, isSelected ? 150 : fillAlpha];
      },
      getLineColor: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        if (zip === selectedZip) return [255, 255, 255, 110];
        if (isNationalGeography) return [255, 255, 255, 60];
        if (isStateGeography) return [15, 23, 42, 200];
        return isOverviewView ? [15, 23, 42, 220] : [30, 41, 59, 160];
      },
      getLineWidth: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        if (zip === selectedZip) return 1.25;
        if (isNationalGeography) return 0.5;
        if (isStateGeography) return 1.25;
        return isOverviewView ? 1.1 : 0.75;
      },
      lineWidthMinPixels: isNationalGeography ? 0.35 : isOverviewView ? 0.85 : 0.5,
      lineWidthMaxPixels: isOverviewView ? 2.5 : 1.5,
      updateTriggers: {
        getFillColor: [colorByZip, selectedZip, activeMetric, isOverviewView, choroplethPalette, geographyLevel],
        getLineColor: [selectedZip, isOverviewView, geographyLevel],
        getLineWidth: [selectedZip, isOverviewView, geographyLevel],
      },
    });
  }, [geoJson, colorByZip, selectedZip, activeMetric, isOverviewView, choroplethPalette, geographyLevel, isNationalGeography, isStateGeography]);

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
      !selectionPathReady ||
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
      getColor: [255, 255, 255, 90],
      getWidth: 1.5,
      widthMinPixels: 1,
      widthMaxPixels: 2,
      capRounded: true,
      jointRounded: true,
    });

    return [outline];
  }, [
    selectedZip,
    selectionRings,
    isOverviewView,
    selectionBorderVisible,
    selectionPathReady,
  ]);

  const labelLayer = useMemo(() => {
    if (!labelsVisible || labelData.length === 0) return null;

    const overview = isOverviewView;
    const labelSize = overview
      ? geographyLevel === "national"
        ? 18
        : geographyLevel === "state"
          ? 14
          : mapZoom < 7
            ? 12
            : 13
      : mapZoom < 6
        ? 11
        : 13;

    return new TextLayer({
      id: overview ? "overview-labels" : "zip-labels",
      data: labelData,
      pickable: false,
      getPosition: (d) => d.position,
      getText: (d) => `${d.name}\n${formatLabelValue(activeMetric, d.value)}`,
      getSize: labelSize,
      getColor: [15, 23, 42, 255],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontWeight: 700,
      outlineWidth: overview ? 4 : 3,
      outlineColor: [255, 255, 255, 250],
      characterSet: "auto",
      updateTriggers: {
        getText: [activeMetric, geographyLevel],
        getSize: [geographyLevel, mapZoom],
      },
    });
  }, [labelData, activeMetric, labelsVisible, isOverviewView, geographyLevel, mapZoom]);

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

  const layers = useMemo(() => {
    const base = useMetroTiles && metroMvtLayer ? metroMvtLayer : choroplethLayer;
    const stack: Layer[] = [base, ...selectionBorderLayers];
    if (pathVisible && pathLayer) stack.push(pathLayer);
    stack.push(...amenityLayers);
    if (labelLayer) stack.push(labelLayer);
    return stack;
  }, [choroplethLayer, metroMvtLayer, useMetroTiles, selectionBorderLayers, pathLayer, amenityLayers, labelLayer, pathVisible]);

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
        return;
      }

      onZipSelect?.(zip);

      const map = mapRef.current;
      if (!map || !info.coordinate || !cinematicOnSelect) return;
      if (!isFiniteLngLat([info.coordinate[0], info.coordinate[1]])) return;

      applyCamera(
        map,
        {
          center: [info.coordinate[0], info.coordinate[1]],
          zoom: 12.5,
          pitch: exploreModeRef.current ? 0 : 60,
          bearing: exploreModeRef.current ? 0 : -15,
          duration: 800,
        },
        false,
        programmaticMoveRef,
      );
    },
    [onZipSelect, onBackgroundClick, cinematicOnSelect, isOverviewView, geographyLevel],
  );

  const syncOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay || !mapReady) return;
    try {
      overlay.setProps({ layers, onClick: handleClick });
    } catch {
      // Deck.gl rejects non-mercator Mapbox projections
    }
  }, [layers, handleClick, mapReady]);

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
    if (
      !selectedZip ||
      selectionRings.length === 0 ||
      !selectionBorderVisible ||
      isOverviewView
    ) {
      setSelectionPathReady(false);
      return;
    }

    setSelectionPathReady(false);
    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      setSelectionPathReady(true);
    };

    const fallback = window.setTimeout(reveal, 900);
    const map = mapRef.current;
    const onMoveEnd = () => reveal();
    map?.once("moveend", onMoveEnd);

    return () => {
      window.clearTimeout(fallback);
      map?.off("moveend", onMoveEnd);
    };
  }, [selectedZip, selectionRings, selectionBorderVisible, isOverviewView, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyInteractionMode(map, exploreMode);
  }, [exploreMode, mapReady, applyInteractionMode]);

  const prevNationalFitRef = useRef(false);

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
          dataAsOfLabel={geoJson.metadata.dataAsOfLabel}
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
