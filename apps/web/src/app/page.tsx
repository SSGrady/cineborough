import { loadMetroShardsGeoJson } from "@cineborough/data";
import { CinematicDiscovery } from "@/components/CinematicDiscovery";

export default function HomePage() {
  const geoJson = loadMetroShardsGeoJson();

  return (
    <main className="page page--cinematic">
      <CinematicDiscovery geoJson={geoJson} />
    </main>
  );
}
