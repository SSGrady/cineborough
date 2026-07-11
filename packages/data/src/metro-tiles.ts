/**
 * National metro vector tile loader stub (ADR-011).
 * Pass tile URL from the web app (`NEXT_PUBLIC_METRO_TILES_URL`).
 */

export interface MetroTileConfig {
  /** PMTiles or MVT tileset URL — e.g. https://cdn.example.com/metros.pmtiles */
  url: string;
  /** Max zoom the tileset supports */
  maxZoom: number;
  /** Layer name inside the tileset */
  sourceLayer: string;
}

const DEFAULT_SOURCE_LAYER = "cbsa";

/** Returns tile config when URL is provided; null disables MVT path (GeoJSON fallback). */
export function getMetroTileConfig(tileUrl?: string | null): MetroTileConfig | null {
  if (!tileUrl) return null;

  return {
    url: tileUrl,
    maxZoom: 10,
    sourceLayer: DEFAULT_SOURCE_LAYER,
  };
}

/** Whether national view should prefer vector tiles over us-metros.geojson. */
export function isMetroTilesEnabled(tileUrl?: string | null): boolean {
  return getMetroTileConfig(tileUrl) !== null;
}
