import { loadMockZipMetrics } from "@cineborough/data";
import { DiscoveryClient } from "@/components/DiscoveryClient";

export default function HomePage() {
  const { zips, metro } = loadMockZipMetrics();

  return (
    <main className="page page--discovery">
      <header className="discovery-header">
        <h1>Cineborough</h1>
        <p>
          {metro} · {zips.length} sandbox ZIPs
        </p>
      </header>
      <DiscoveryClient zips={zips} />
    </main>
  );
}
