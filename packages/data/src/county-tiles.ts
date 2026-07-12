/**
 * National county vector tile loader stub (ADR-011 county tier).
 * Pass tile URL from the web app (`NEXT_PUBLIC_COUNTY_TILES_URL`).
 */

export interface CountyTileConfig {
  /** PMTiles or MVT tileset URL — e.g. /tiles/us-counties.pmtiles */
  url: string;
  /** Max zoom the tileset supports */
  maxZoom: number;
  /** Layer name inside the tileset */
  sourceLayer: string;
}

const DEFAULT_SOURCE_LAYER = "county";

/** Returns tile config when URL is provided; null disables MVT path (GeoJSON fallback). */
export function getCountyTileConfig(tileUrl?: string | null): CountyTileConfig | null {
  if (!tileUrl) return null;

  return {
    url: tileUrl,
    maxZoom: 12,
    sourceLayer: DEFAULT_SOURCE_LAYER,
  };
}

/** Whether county view should prefer vector tiles over in-memory GeoJSON. */
export function isCountyTilesEnabled(tileUrl?: string | null): boolean {
  return getCountyTileConfig(tileUrl) !== null;
}
