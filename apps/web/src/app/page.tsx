import { loadDcMetroGeoJson } from "@cineborough/data";
import { CinematicDiscovery } from "@/components/CinematicDiscovery";

export default function HomePage() {
  const geoJson = loadDcMetroGeoJson();

  return (
    <main className="page page--cinematic">
      <CinematicDiscovery geoJson={geoJson} />
    </main>
  );
}
