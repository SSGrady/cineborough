"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, PathLayer, TextLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { DcMetroGeoJson, MetricLayerKey } from "@cineborough/data";
import {
  getNormalizedMetricValuesFromGeoJson,
  getRawMetricFromFeature,
  loadTransitPaths,
  METRIC_LAYERS,
} from "@cineborough/data";
import {
  colorForNormalizedScore,
  DC_METRO_CENTER,
  DEFAULT_ZOOM,
  type MapCameraTarget,
} from "@cineborough/geo";
import { formatCurrency, formatPercent } from "@/lib/format";
import { BottomBar } from "./BottomBar";

/** Requires NEXT_PUBLIC_MAPBOX_TOKEN in .env.local — see apps/web/.env.example */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MapViewProps {
  geoJson: DcMetroGeoJson;
  activeMetric?: MetricLayerKey;
  selectedZip?: string | null;
  onZipSelect?: (zipCode: string | null) => void;
  cameraTarget?: MapCameraTarget | null;
  pathVisible?: boolean;
  labelsVisible?: boolean;
  exploreMode?: boolean;
  onToggleExploreMode?: () => void;
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
  return `${lng.toFixed(4)},${lat.toFixed(4)},${target.zoom},${target.pitch ?? 0},${target.bearing ?? 0}`;
}

export function MapView({
  geoJson,
  activeMetric = "opportunityScore",
  selectedZip = null,
  onZipSelect,
  cameraTarget = null,
  pathVisible = false,
  labelsVisible = true,
  exploreMode = false,
  onToggleExploreMode,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const lastCameraKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);

  const metricLabel =
    METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "Opportunity Index";

  const colorByZip = useMemo(
    () => getNormalizedMetricValuesFromGeoJson(geoJson, activeMetric),
    [geoJson, activeMetric],
  );

  const labelData = useMemo(
    () =>
      geoJson.features.map((f) => ({
        position: [f.properties.labelLng, f.properties.labelLat] as [number, number],
        zipCode: f.properties.zipCode,
        name: f.properties.neighborhoodName,
        value: getRawMetricFromFeature(f.properties, activeMetric),
      })),
    [geoJson, activeMetric],
  );

  const choroplethLayer = useMemo(() => {
    return new GeoJsonLayer({
      id: "zip-choropleth",
      data: geoJson,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      getFillColor: (feature) => {
        const props = feature?.properties as Record<string, unknown> | undefined;
        const zip = props?.zipCode as string | undefined;
        const isSelected = zip === selectedZip;

        if (activeMetric === "opportunityScore" && props?.fillColorRgb) {
          const rgb = props.fillColorRgb as [number, number, number];
          return [...rgb, isSelected ? 230 : 190];
        }

        const score = zip ? (colorByZip.get(zip) ?? 0) : 0;
        const hex = colorForNormalizedScore(score);
        const [r, g, b] = hexToRgb(hex);
        return [r, g, b, isSelected ? 230 : 190];
      },
      getLineColor: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        return zip === selectedZip ? [225, 29, 72, 255] : [100, 116, 139, 180];
      },
      getLineWidth: (feature) => {
        const zip = (feature?.properties as { zipCode?: string })?.zipCode;
        return zip === selectedZip ? 3 : 1;
      },
      lineWidthMinPixels: 1,
      updateTriggers: {
        getFillColor: [colorByZip, selectedZip, activeMetric],
        getLineColor: [selectedZip],
        getLineWidth: [selectedZip],
      },
    });
  }, [geoJson, colorByZip, selectedZip, activeMetric]);

  const labelLayer = useMemo(() => {
    if (!labelsVisible) return null;
    return new TextLayer({
      id: "zip-labels",
      data: labelData,
      pickable: false,
      getPosition: (d) => d.position,
      getText: (d) => `${d.name}\n${formatLabelValue(activeMetric, d.value)}`,
      getSize: 12,
      getColor: [30, 41, 59, 255],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontFamily: "system-ui, sans-serif",
      fontWeight: 600,
      outlineWidth: 2,
      outlineColor: [255, 255, 255, 220],
      updateTriggers: {
        getText: [activeMetric],
      },
    });
  }, [labelData, activeMetric, labelsVisible]);

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
    const base = labelLayer
      ? pathVisible
        ? [choroplethLayer, pathLayer, labelLayer]
        : [choroplethLayer, labelLayer]
      : pathVisible
        ? [choroplethLayer, pathLayer]
        : [choroplethLayer];
    return base;
  }, [choroplethLayer, pathLayer, labelLayer, pathVisible]);

  const handleClick = useCallback(
    (info: PickingInfo) => {
      const zip = (info.object?.properties as { zipCode?: string })?.zipCode;
      if (!zip) return;

      onZipSelect?.(zip);

      const map = mapRef.current;
      if (map && info.coordinate) {
        map.stop();
        map.flyTo({
          center: [info.coordinate[0], info.coordinate[1]],
          zoom: 12.5,
          pitch: exploreMode ? 0 : 45,
          bearing: exploreMode ? 0 : -20,
          duration: 900,
        });
      }
    },
    [onZipSelect, exploreMode],
  );

  const syncOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const map = mapRef.current;
    if (!overlay || !map) return;
    overlay.setProps({ layers, onClick: handleClick });
    // Keep Deck.gl in sync with Mapbox camera during pan/zoom/fly
    const deck = (overlay as unknown as { _deck?: { redraw: () => void } })._deck;
    deck?.redraw();
  }, [layers, handleClick]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") return;
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: DC_METRO_CENTER,
      zoom: DEFAULT_ZOOM,
      dragPan: true,
      dragRotate: true,
      pitchWithRotate: true,
    });

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers,
      onClick: handleClick,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => {
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
      setMapReady(true);
    });
    map.on("move", syncOverlay);
    map.on("moveend", syncOverlay);
    map.addControl(overlay);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.off("move", syncOverlay);
      map.off("moveend", syncOverlay);
      overlay.setProps({ layers: [] });
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

    if (exploreMode) {
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
    } else {
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
    }
  }, [exploreMode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraTarget || !mapReady || exploreMode) return;

    const key = cameraKey(cameraTarget);
    if (lastCameraKeyRef.current === key) return;
    lastCameraKeyRef.current = key;

    map.stop();
    map.flyTo({
      center: cameraTarget.center,
      zoom: cameraTarget.zoom,
      pitch: cameraTarget.pitch ?? 0,
      bearing: cameraTarget.bearing ?? 0,
      duration: cameraTarget.duration ?? 1200,
      essential: true,
    });
  }, [cameraTarget, mapReady, exploreMode]);

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
        | { zipCode?: string; neighborhoodName?: string }
        | undefined;
      if (props?.zipCode) {
        const value = labelData.find((d) => d.zipCode === props.zipCode);
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${props.neighborhoodName}</strong><br/>${value ? formatLabelValue(activeMetric, value.value) : ""}`,
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
  }, [mapReady, tooltipsEnabled, labelData, activeMetric]);

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
