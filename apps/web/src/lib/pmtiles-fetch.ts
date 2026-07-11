import { load } from "@loaders.gl/core";
import { MVTWorkerLoader } from "@loaders.gl/mvt";
import { PMTiles } from "pmtiles";
import type { MetroTileConfig } from "@cineborough/data";

let pmtilesInstance: PMTiles | null = null;
let pmtilesUrl: string | null = null;

function getPMTiles(url: string): PMTiles {
  if (!pmtilesInstance || pmtilesUrl !== url) {
    pmtilesInstance = new PMTiles(url);
    pmtilesUrl = url;
  }
  return pmtilesInstance;
}

export function pmtilesTileJson(config: MetroTileConfig) {
  return {
    tilejson: "3.0.0" as const,
    tiles: [`pmtiles://${config.url}/{z}/{x}/{y}.mvt`],
    minzoom: 3,
    maxzoom: config.maxZoom,
    vector_layers: [{ id: config.sourceLayer, fields: {} }],
  };
}

type DeckFetchContext = {
  loadOptions?: {
    mvt?: { tileIndex?: { x: number; y: number; z: number } };
  };
  signal?: AbortSignal;
};

/** Custom fetch for MVTLayer — reads MVT bytes from a PMTiles archive. */
export function createPmtilesFetch(tileUrl: string) {
  const pm = getPMTiles(tileUrl);
  return async (url: string, context?: DeckFetchContext) => {
    void url;
    const tileIndex = context?.loadOptions?.mvt?.tileIndex;
    if (!tileIndex) return null;
    const { x, y, z } = tileIndex;
    const resp = await pm.getZxy(z, x, y, context.signal);
    if (!resp) return null;
    return load(resp.data, MVTWorkerLoader, context.loadOptions);
  };
}
