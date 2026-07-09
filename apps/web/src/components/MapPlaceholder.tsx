/**
 * Map placeholder for Phase 1 choropleth (T004).
 * Wire Mapbox GL JS + Deck.gl GeoJsonLayer here.
 */
export function MapPlaceholder() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token === "your_mapbox_token_here") {
    return (
      <div className="map-placeholder">
        <p>Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local to enable the map.</p>
      </div>
    );
  }

  return (
    <div className="map-placeholder">
      <p>Map component ready — implement choropleth in T004.</p>
    </div>
  );
}
