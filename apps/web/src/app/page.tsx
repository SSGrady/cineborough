import { loadMockZipMetrics } from "@cineborough/data";
import { PhaseOneHero } from "@/components/PhaseOneHero";

export default function HomePage() {
  const { zips, metro } = loadMockZipMetrics();

  return (
    <main className="page">
      <PhaseOneHero metro={metro} zipCount={zips.length} />
      <section className="preview">
        <h2>Phase 1 — Data Engine</h2>
        <p>
          Reventure-style choropleth map with Opportunity Index and hybrid investor / hope-core
          sidebar layers. Cinematic 3D fly-throughs arrive in Phase 2.
        </p>
        <ul className="zip-list">
          {zips.map((zip) => (
            <li key={zip.zip}>
              <strong>{zip.zip}</strong> — {zip.name}
              <span className="score">
                Opportunity: {zip.opportunityScore.toFixed(1)} (normalized{" "}
                {zip.opportunityScoreNormalized?.toFixed(0)})
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
