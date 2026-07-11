"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, PathLayer, TextLayer } from "@deck.gl/layers";
import { MVTLayer } from "@deck.gl/geo-layers";
import type { PickingInfo, Layer } from "@deck.gl/core";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import {
  getNormalizedMetricValuesFromGeoJson,
  getRawMetricFromFeature,
  loadTransitPaths,
  METRIC_LAYERS,
  getMetroTileConfig,
  isMetroTilesEnabled,
} from "@cineborough/data";
import {
  colorForNormalizedScore,
  US_NATIONAL_CAMERA,
  US_CONTINENTAL_BOUNDS,
  US_FULL_BOUNDS,
  US_MAP_PROJECTION,
  US_NATIONAL_FIT_PADDING,
  type MapCameraTarget,
} from "@cineborough/geo";
import type { GeographyLevel } from "./Sidebar";
import { formatCurrency, formatPercent } from "@/lib/format";
import { BottomBar } from "./BottomBar";
import { buildTrailPaths, extractOuterRings } from "@/lib/selection-border";
import { createPmtilesFetch } from "@/lib/pmtiles-fetch";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const METRO_TILES_URL = process.env.NEXT_PUBLIC_METRO_TILES_URL ?? null;
const MAP_STYLE = "mapbox://styles/mapbox/outdoors-v12";
/** Seconds for one full lap — constant rate, arc-length geometry. */
const TRAIL_LAP_SEC_ZIP = 3.1;
const TRAIL_LAP_SEC_NATIONAL = 2.75;

interface MapViewProps {
  geoJson: DcMetroGeoJson;
  activeMetric?: MetricLayerKey;
  selectedZip?: string | null;
  onZipSelect?: (zipCode: string | null) => void;
  cameraTarget?: MapCameraTarget | null;
  /** jumpTo each frame (scroll scrub) — avoids deck.gl drift during flyTo */
  cameraInstant?: boolean;
  pathVisible?: boolean;
  labelsVisible?: boolean;
  exploreMode?: boolean;
  onToggleExploreMode?: () => void;
  onUserMapMove?: () => void;
  mapBounds?: [[number, number], [number, number]] | null;
  geographyLevel?: GeographyLevel;
  /** Flat continental overview — national/state/metro/county tabs */
  overviewMode?: boolean;
  fitNationalBounds?: boolean;
  /** When false, map clicks do not tilt/fly the camera (overview regions) */
  cinematicOnSelect?: boolean;
}

interface LabelPoint {
  position: [number, number];
  zipCode: string;
  name: string;
  value: number;
}

function buildMetroLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
  minHomeValue = 1,
): LabelPoint[] {
  return geoJson.features
    .filter((f) => f.properties.medianHomeValue >= minHomeValue)
    .map((f) => ({
      position: [f.properties.labelLng, f.properties.labelLat] as [number, number],
      zipCode: f.properties.zipCode,
      name: f.properties.neighborhoodName,
      value: getRawMetricFromFeature(f.properties, activeMetric),
    }));
}

function buildStateLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): LabelPoint[] {
  const byState = new Map<
    string,
    { lng: number; lat: number; count: number; total: number }
  >();

  for (const f of geoJson.features) {
    if (f.properties.medianHomeValue <= 0) continue;
    const st = f.properties.state?.trim();
    if (!st || st.length > 2) continue;
    const value = getRawMetricFromFeature(f.properties, activeMetric);
    const entry = byState.get(st) ?? { lng: 0, lat: 0, count: 0, total: 0 };
    entry.lng += f.properties.labelLng;
    entry.lat += f.properties.labelLat;
    entry.count += 1;
    entry.total += value;
    byState.set(st, entry);
  }

  return Array.from(byState.entries()).map(([state, entry]) => ({
    position: [entry.lng / entry.count, entry.lat / entry.count] as [number, number],
    zipCode: state,
    name: state,
    value: entry.total / entry.count,
  }));
}

function buildNationalLabelData(
  geoJson: DcMetroGeoJson,
  activeMetric: MetricLayerKey,
): LabelPoint[] {
  const values: number[] = [];
  for (const f of geoJson.features) {
    if (f.properties.medianHomeValue <= 0) continue;
    values.push(getRawMetricFromFeature(f.properties, activeMetric));
  }
  if (values.length === 0) return [];
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return [
    {
      position: [-96.5, 39.2],
      zipCode: "US",
      name: "United States",
      value: avg,
    },
  ];
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

function cameraKey(target: MapCameraTarget): string {
  const [lng, lat] = target.center;
  return `${lng.toFixed(5)},${lat.toFixed(5)},${target.zoom.toFixed(3)},${target.pitch ?? 0},${target.bearing ?? 0}`;
}

function applyCamera(
  map: mapboxgl.Map,
  target: MapCameraTarget,
  instant: boolean,
  programmaticRef: { current: boolean },
) {
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
  activeMetric = "opportunityScore",
  selectedZip = null,
  onZipSelect,
  cameraTarget = null,
  cameraInstant = false,
  pathVisible = false,
  labelsVisible = true,
  exploreMode = false,
  onToggleExploreMode,
  onUserMapMove,
  mapBounds = US_CONTINENTAL_BOUNDS,
  geographyLevel = "metro",
  overviewMode = false,
  fitNationalBounds = false,
  cinematicOnSelect = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const lastCameraKeyRef = useRef<string | null>(null);
  const programmaticMoveRef = useRef(false);
  const exploreModeRef = useRef(exploreMode);
  const onUserMapMoveRef = useRef(onUserMapMove);
  const [mapReady, setMapReady] = useState(false);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [trailPhase, setTrailPhase] = useState(0);
  const trailProgressRef = useRef(0);
  const trailLastFrameRef = useRef(0);

  exploreModeRef.current = exploreMode;
  onUserMapMoveRef.current = onUserMapMove;

  const isOverviewView = overviewMode;
  const metroTileConfig = useMemo(
    () => (isOverviewView ? getMetroTileConfig(METRO_TILES_URL) : null),
    [isOverviewView],
  );
  const useMetroTiles = isOverviewView && isMetroTilesEnabled(METRO_TILES_URL);

  const metricLabel =
    METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "Opportunity Index";

  const colorByZip = useMemo(
    () => getNormalizedMetricValuesFromGeoJson(geoJson, activeMetric),
    [geoJson, activeMetric],
  );

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
    return buildMetroLabelData(geoJson, activeMetric);
  }, [geoJson, activeMetric, overviewMode, geographyLevel]);

  const selectionRings = useMemo(
    () => (selectedZip ? extractOuterRings(geoJson, selectedZip) : []),
    [geoJson, selectedZip],
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

        if (props?.fillColorRgb) {
          const rgb = props.fillColorRgb as [number, number, number];
          const alpha = isSelected ? 150 : isOverviewView ? 85 : 75;
          return [...rgb, alpha];
        }

        const score = zip ? (colorByZip.get(zip) ?? 0) : 0;
        const hex = colorForNormalizedScore(score);
        const [r, g, b] = hexToRgb(hex);
        const alpha = isSelected ? 150 : isOverviewView ? 85 : 75;
        return [r, g, b, alpha];
      },
      getLineColor: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        if (zip === selectedZip) return [255, 255, 255, 110];
        return isOverviewView ? [30, 41, 59, 180] : [30, 41, 59, 160];
      },
      getLineWidth: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        return zip === selectedZip ? 1.25 : isOverviewView ? 1 : 0.75;
      },
      lineWidthMinPixels: isOverviewView ? 0.75 : 0.5,
      lineWidthMaxPixels: isOverviewView ? 2 : 1.5,
      updateTriggers: {
        getFillColor: [colorByZip, selectedZip, activeMetric, isOverviewView],
        getLineColor: [selectedZip, isOverviewView],
        getLineWidth: [selectedZip, isOverviewView],
      },
    });
  }, [geoJson, colorByZip, selectedZip, activeMetric, isOverviewView]);

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
    if (!selectedZip || selectionRings.length === 0) return [];

    const trailData = buildTrailPaths(selectionRings, trailPhase);
    const outlineData = selectionRings.map(({ ring, regionId }) => ({ path: ring, regionId }));

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

    const glow = new PathLayer({
      id: "selection-trail-glow",
      data: trailData,
      pickable: false,
      getPath: (d) => d.path,
      getColor: [255, 255, 255, 95],
      getWidth: 14,
      widthMinPixels: 7,
      widthMaxPixels: 18,
      capRounded: true,
      jointRounded: true,
    });

    const trail = new PathLayer({
      id: "selection-trail",
      data: trailData,
      pickable: false,
      getPath: (d) => d.path,
      getColor: [255, 255, 255, 230],
      getWidth: 3.5,
      widthMinPixels: 2.5,
      widthMaxPixels: 5,
      capRounded: true,
      jointRounded: true,
    });

    return [outline, glow, trail];
  }, [selectedZip, selectionRings, trailPhase, isOverviewView]);

  const labelLayer = useMemo(() => {
    if (!labelsVisible || labelData.length === 0) return null;

    const national = isOverviewView;
    return new TextLayer({
      id: national ? "metro-labels" : "zip-labels",
      data: labelData,
      pickable: false,
      getPosition: (d) => d.position,
      getText: (d) =>
        national
          ? `${d.name}\n${formatLabelValue(activeMetric, d.value)}`
          : `${d.name}\n${formatLabelValue(activeMetric, d.value)}`,
      getSize: national ? 11 : 12,
      getColor: [15, 23, 42, 255],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontWeight: 600,
      outlineWidth: national ? 3 : 2,
      outlineColor: [255, 255, 255, 240],
      characterSet: "auto",
      updateTriggers: {
        getText: [activeMetric, isOverviewView],
      },
    });
  }, [labelData, activeMetric, labelsVisible, isOverviewView]);

  const pathLayer = useMemo(() => {
    const paths = loadTransitPaths();
    return new PathLayer({
      id: "transit-path",
      data: paths.features,
      pickable: false,
      getPath: (feature) => feature.geometry.coordinates,
      getColor: [225, 29, 72, pathVisible ? 200 : 0],
      getWidth: 5,
      widthMinPixels: 3,
      capRounded: true,
      jointRounded: true,
      updateTriggers: {
        getColor: [pathVisible],
      },
    });
  }, [pathVisible]);

  const layers = useMemo(() => {
    const base = useMetroTiles && metroMvtLayer ? metroMvtLayer : choroplethLayer;
    const stack: Layer[] = [base, ...selectionBorderLayers];
    if (pathVisible) stack.push(pathLayer);
    if (labelLayer) stack.push(labelLayer);
    return stack;
  }, [choroplethLayer, metroMvtLayer, useMetroTiles, selectionBorderLayers, pathLayer, labelLayer, pathVisible]);

  const handleClick = useCallback(
    (info: PickingInfo) => {
      const zip = (info.object?.properties as { zipCode?: string })?.zipCode;
      if (!zip) return;

      onZipSelect?.(zip);

      const map = mapRef.current;
      if (!map || !info.coordinate || !cinematicOnSelect) return;

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
    [onZipSelect, cinematicOnSelect],
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

    const onZoomEnd = () => {
      if (!programmaticMoveRef.current) onUserGestureEnd();
    };

    const onMoveEnd = () => {
      programmaticMoveRef.current = false;
    };

    map.on("dragend", onUserGestureEnd);
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
    if (!selectedZip || selectionRings.length === 0) {
      trailProgressRef.current = 0;
      setTrailPhase(0);
      return;
    }

    const lapDuration = isOverviewView ? TRAIL_LAP_SEC_NATIONAL : TRAIL_LAP_SEC_ZIP;
    trailProgressRef.current = 0;
    trailLastFrameRef.current = performance.now();
    setTrailPhase(0);

    let frame = 0;

    const animate = (now: number) => {
      const dt = (now - trailLastFrameRef.current) / 1000;
      trailLastFrameRef.current = now;

      trailProgressRef.current += dt / lapDuration;

      if (trailProgressRef.current >= 1) {
        trailProgressRef.current = 0;
      }

      setTrailPhase(trailProgressRef.current);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [selectedZip, selectionRings, isOverviewView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyInteractionMode(map, exploreMode);
  }, [exploreMode, mapReady, applyInteractionMode]);

  const prevNationalFitRef = useRef(false);

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
    }
    prevNationalFitRef.current = fitNationalBounds;
  }, [fitNationalBounds, mapReady, exploreMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraTarget || !mapReady || exploreMode) return;
    if (fitNationalBounds) return;

    const key = cameraKey(cameraTarget);
    if (lastCameraKeyRef.current === key) return;
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
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${title ?? props.zipCode}</strong><br/>${value ? formatLabelValue(activeMetric, value.value) : ""}`,
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
          dataAsOfLabel={geoJson.metadata.dataAsOfLabel}
          metricLabel={metricLabel}
          tooltipsEnabled={tooltipsEnabled}
          onToggleTooltips={() => setTooltipsEnabled((v) => !v)}
          exploreMode={exploreMode}
          onToggleExploreMode={onToggleExploreMode}
        />
      )}
    </div>
  );
}
