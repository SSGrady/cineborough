import type { Layer } from "@deck.gl/core";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { getGoogleMapsApiKey, is3DTilesFlagEnabled } from "./cinematic-flags";

const GOOGLE_3D_TILES_ROOT = "https://tile.googleapis.com/v1/3dtiles/root.json";

export type Google3DTilesStatus = "disabled" | "missing-key" | "ready";

export function getGoogle3DTilesStatus(): Google3DTilesStatus {
  if (!is3DTilesFlagEnabled()) return "disabled";
  if (!getGoogleMapsApiKey()) return "missing-key";
  return "ready";
}

/**
 * Creates a Deck.gl Tile3DLayer for Google Photorealistic 3D Tiles.
 * Returns null when flag is off or API key is missing — MapView falls back to 2D pitch.
 */
export function createGoogle3DTilesLayer(): Layer | null {
  const status = getGoogle3DTilesStatus();
  if (status !== "ready") return null;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  return new Tile3DLayer({
    id: "google-3d-tiles",
    data: `${GOOGLE_3D_TILES_ROOT}?key=${apiKey}`,
    pickable: false,
    loadOptions: {
      fetch: { headers: { "X-Goog-Api-Key": apiKey } },
    },
    onTilesetLoad: (tileset) => {
      tileset.setProps({ maximumScreenSpaceError: 8 });
    },
  });
}
