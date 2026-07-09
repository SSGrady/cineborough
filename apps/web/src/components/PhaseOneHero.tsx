interface PhaseOneHeroProps {
  metro: string;
  zipCount: number;
}

export function PhaseOneHero({ metro, zipCount }: PhaseOneHeroProps) {
  return (
    <header className="hero">
      <h1>Cineborough</h1>
      <p className="tagline">Hope-core real estate spatial discovery</p>
      <p className="meta">
        {metro} · {zipCount} sandbox ZIPs · Phase 1: Data Engine
      </p>
    </header>
  );
}
