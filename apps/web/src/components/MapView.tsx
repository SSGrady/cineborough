"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, PathLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { MetricLayerKey, ZipMetrics } from "@cineborough/data";
import { getNormalizedMetricValues, loadZipBoundaries, loadTransitPaths, METRIC_LAYERS } from "@cineborough/data";
import {
  colorForNormalizedScore,
  DC_METRO_CENTER,
  DEFAULT_ZOOM,
  type MapCameraTarget,
} from "@cineborough/geo";
import { ColorLegend } from "./ColorLegend";

/** Requires NEXT_PUBLIC_MAPBOX_TOKEN in .env.local — see apps/web/.env.example */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MapViewProps {
  zips: ZipMetrics[];
  activeMetric?: MetricLayerKey;
  selectedZip?: string | null;
  onZipSelect?: (zipCode: string | null) => void;
  /** External camera control for scroll-driven fly-throughs (ADR-008). */
  cameraTarget?: MapCameraTarget | null;
  /** Show mock transit path overlay (neighborhood descent section). */
  pathVisible?: boolean;
}

export function MapView({
  zips,
  activeMetric = "opportunityScore",
  selectedZip = null,
  onZipSelect,
  cameraTarget = null,
  pathVisible = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const metricLabel =
    METRIC_LAYERS.find((m) => m.key === activeMetric)?.label ?? "Opportunity Index";

  const colorByZip = useMemo(
    () => getNormalizedMetricValues(zips, activeMetric),
    [zips, activeMetric],
  );

  const choroplethLayer = useMemo(() => {
    const boundaries = loadZipBoundaries();
    return new GeoJsonLayer({
      id: "zip-choropleth",
      data: boundaries,
      pickable: true,
      stroked: true,
      filled: true,
      getFillColor: (feature) => {
        const zip = feature?.properties?.zip as string | undefined;
        const score = zip ? (colorByZip.get(zip) ?? 0) : 0;
        const hex = colorForNormalizedScore(score);
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const isSelected = zip === selectedZip;
        return [r, g, b, isSelected ? 230 : 180];
      },
      getLineColor: (feature) => {
        const zip = feature?.properties?.zip as string | undefined;
        return zip === selectedZip ? [255, 255, 255, 255] : [15, 23, 42, 200];
      },
      getLineWidth: (feature) => {
        const zip = feature?.properties?.zip as string | undefined;
        return zip === selectedZip ? 3 : 1;
      },
      lineWidthMinPixels: 1,
      updateTriggers: {
        getFillColor: [colorByZip, selectedZip],
        getLineColor: [selectedZip],
        getLineWidth: [selectedZip],
      },
    });
  }, [colorByZip, selectedZip]);

  const pathLayer = useMemo(() => {
    const paths = loadTransitPaths();
    return new PathLayer({
      id: "transit-path",
      data: paths.features,
      pickable: false,
      getPath: (feature) => feature.geometry.coordinates,
      getColor: [34, 197, 94, pathVisible ? 220 : 0],
      getWidth: 5,
      widthMinPixels: 3,
      capRounded: true,
      jointRounded: true,
      updateTriggers: {
        getColor: [pathVisible],
      },
    });
  }, [pathVisible]);

  const layers = useMemo(
    () => (pathVisible ? [choroplethLayer, pathLayer] : [choroplethLayer]),
    [choroplethLayer, pathLayer, pathVisible],
  );

  const handleClick = useCallback(
    (info: PickingInfo) => {
      const zip = info.object?.properties?.zip as string | undefined;
      if (!zip) return;

      console.info("[MapView] ZIP selected (Level 2):", zip);
      onZipSelect?.(zip);

      const map = mapRef.current;
      if (map && info.coordinate) {
        map.flyTo({
          center: [info.coordinate[0], info.coordinate[1]],
          zoom: 12.5,
          pitch: 45,
          bearing: -20,
          duration: 1400,
        });
      }
    },
    [onZipSelect],
  );

  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") return;
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DC_METRO_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers,
      onClick: handleClick,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => setMapReady(true));
    map.addControl(overlay);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      overlay.setProps({ layers: [] });
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    overlayRef.current?.setProps({ layers, onClick: handleClick });
  }, [layers, handleClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraTarget || !mapReady) return;

    map.flyTo({
      center: cameraTarget.center,
      zoom: cameraTarget.zoom,
      pitch: cameraTarget.pitch ?? 0,
      bearing: cameraTarget.bearing ?? 0,
      duration: cameraTarget.duration ?? 1600,
      essential: true,
    });
  }, [cameraTarget, mapReady]);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") {
    return (
      <div className="map-placeholder">
        <p>Set NEXT_PUBLIC_MAPBOX_TOKEN in apps/web/.env.local to enable the map.</p>
        <p className="map-placeholder__hint">Get a token at https://account.mapbox.com/access-tokens/</p>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-view__canvas" />
      {mapReady && <ColorLegend title={metricLabel} />}
    </div>
  );
}
