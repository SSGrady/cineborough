import { loadMockZipMetrics } from "@cineborough/data";
import { PhaseOneHero } from "@/components/PhaseOneHero";
import { DiscoveryClient } from "@/components/DiscoveryClient";

export default function HomePage() {
  const { zips, metro } = loadMockZipMetrics();

  return (
    <main className="page page--discovery">
      <PhaseOneHero metro={metro} zipCount={zips.length} />
      <DiscoveryClient zips={zips} />
    </main>
  );
}
