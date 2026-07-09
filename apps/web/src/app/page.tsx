import { loadDcMetroGeoJson } from "@cineborough/data";
import { CinematicDiscovery } from "@/components/CinematicDiscovery";

export default function HomePage() {
  const geoJson = loadDcMetroGeoJson();

  return (
    <main className="page page--cinematic">
      <header className="cinematic-header">
        <h1>Cineborough</h1>
        <p>
          {geoJson.metadata.metro} · scroll to explore
        </p>
      </header>
      <CinematicDiscovery geoJson={geoJson} />
    </main>
  );
}
