const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface MapboxStaticImageOptions {
  center: [number, number];
  zoom?: number;
  width?: number;
  height?: number;
  bearing?: number;
  pitch?: number;
  style?: string;
}

/**
 * Build a Mapbox Static Images API URL for blurred satellite backdrops.
 * Uses the existing NEXT_PUBLIC_MAPBOX_TOKEN — no Google API required.
 */
export function buildMapboxStaticImageUrl(options: MapboxStaticImageOptions): string | null {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") return null;

  const [lng, lat] = options.center;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const zoom = options.zoom ?? 15;
  const bearing = options.bearing ?? 0;
  const pitch = options.pitch ?? 0;
  const width = options.width ?? 800;
  const height = options.height ?? 450;
  const style = options.style ?? "mapbox/satellite-streets-v12";

  const overlay = `${lng},${lat},${zoom},${bearing},${pitch}`;
  const size = `${width}x${height}@2x`;

  return `https://api.mapbox.com/styles/v1/${style}/static/${overlay}/${size}?access_token=${MAPBOX_TOKEN}`;
}
