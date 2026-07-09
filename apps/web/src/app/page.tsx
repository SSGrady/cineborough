import { loadMockZipMetrics } from "@cineborough/data";
import { CinematicDiscovery } from "@/components/CinematicDiscovery";

export default function HomePage() {
  const { zips, metro } = loadMockZipMetrics();

  return (
    <main className="page page--cinematic">
      <header className="cinematic-header">
        <h1>Cineborough</h1>
        <p>
          {metro} · scroll to explore
        </p>
      </header>
      <CinematicDiscovery zips={zips} />
    </main>
  );
}
