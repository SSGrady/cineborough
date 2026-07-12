/**
 * Generates baseline mock metrics for expanded sandbox ZIPs.
 * Live ingest overlays ZHVI/ACS/derived fields at shard build.
 * Run: node --experimental-strip-types src/scripts/seed-sandbox-metrics.ts
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SANDBOX_ZIPS, ORLANDO_SANDBOX_ZIPS, SF_BAY_SANDBOX_ZIPS, SAN_JOSE_SANDBOX_ZIPS } from "../validation.ts";
import type { ZipMetricsInput } from "../validation.ts";
import { deriveExtendedMetrics } from "../extended-metrics.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = resolve(__dirname, "../../../../data/mock");

interface ZipSeed {
  zip: string;
  name: string;
  state: string;
  tier: "premium" | "mid" | "value";
}

const DC_SEEDS: ZipSeed[] = [
  { zip: "22201", name: "Arlington (Clarendon)", state: "VA", tier: "premium" },
  { zip: "22202", name: "Arlington (Crystal City)", state: "VA", tier: "mid" },
  { zip: "22203", name: "Arlington (Ballston)", state: "VA", tier: "premium" },
  { zip: "22204", name: "Arlington (Glencarlyn)", state: "VA", tier: "value" },
  { zip: "22205", name: "Arlington (Cherrydale)", state: "VA", tier: "mid" },
  { zip: "22206", name: "Arlington (South)", state: "VA", tier: "value" },
  { zip: "22207", name: "Arlington (Yorktown)", state: "VA", tier: "premium" },
  { zip: "20001", name: "Washington DC (Shaw/U Street)", state: "DC", tier: "premium" },
  { zip: "20002", name: "Washington DC (Capitol Hill)", state: "DC", tier: "mid" },
  { zip: "20003", name: "Washington DC (Anacostia)", state: "DC", tier: "value" },
  { zip: "20009", name: "Washington DC (Adams Morgan)", state: "DC", tier: "premium" },
  { zip: "20037", name: "Washington DC (Foggy Bottom)", state: "DC", tier: "premium" },
  { zip: "22301", name: "Alexandria (Old Town)", state: "VA", tier: "premium" },
  { zip: "22302", name: "Alexandria (Rosemont)", state: "VA", tier: "mid" },
  { zip: "22304", name: "Alexandria (West End)", state: "VA", tier: "mid" },
  { zip: "20814", name: "Bethesda", state: "MD", tier: "premium" },
  { zip: "20815", name: "Chevy Chase", state: "MD", tier: "premium" },
  { zip: "20816", name: "Bethesda (East)", state: "MD", tier: "premium" },
];

const SF_BAY_SEEDS: ZipSeed[] = [
  { zip: "94102", name: "San Francisco (Tenderloin)", state: "CA", tier: "mid" },
  { zip: "94103", name: "San Francisco (SOMA)", state: "CA", tier: "premium" },
  { zip: "94107", name: "San Francisco (Dogpatch)", state: "CA", tier: "premium" },
  { zip: "94109", name: "San Francisco (Nob Hill)", state: "CA", tier: "premium" },
  { zip: "94110", name: "San Francisco (Mission)", state: "CA", tier: "mid" },
  { zip: "94114", name: "San Francisco (Castro)", state: "CA", tier: "premium" },
  { zip: "94117", name: "San Francisco (Haight)", state: "CA", tier: "premium" },
  { zip: "94122", name: "San Francisco (Sunset)", state: "CA", tier: "mid" },
  { zip: "94123", name: "San Francisco (Marina)", state: "CA", tier: "premium" },
  { zip: "94131", name: "San Francisco (Glen Park)", state: "CA", tier: "mid" },
  { zip: "94601", name: "Oakland (Eastlake)", state: "CA", tier: "value" },
  { zip: "94607", name: "Oakland (West Oakland)", state: "CA", tier: "value" },
  { zip: "94611", name: "Oakland (Rockridge)", state: "CA", tier: "premium" },
  { zip: "94704", name: "Berkeley (Downtown)", state: "CA", tier: "mid" },
  { zip: "94705", name: "Berkeley (Elmwood)", state: "CA", tier: "premium" },
  { zip: "94596", name: "Walnut Creek", state: "CA", tier: "premium" },
  { zip: "94520", name: "Concord", state: "CA", tier: "mid" },
  { zip: "94549", name: "Lafayette", state: "CA", tier: "premium" },
];

const SAN_JOSE_SEEDS: ZipSeed[] = [
  { zip: "95110", name: "San Jose (Downtown)", state: "CA", tier: "premium" },
  { zip: "95112", name: "San Jose (Japantown)", state: "CA", tier: "mid" },
  { zip: "95116", name: "San Jose (East San Jose)", state: "CA", tier: "value" },
  { zip: "95125", name: "San Jose (Willow Glen)", state: "CA", tier: "premium" },
  { zip: "95126", name: "San Jose (Rose Garden)", state: "CA", tier: "premium" },
  { zip: "95128", name: "San Jose (Burbank)", state: "CA", tier: "mid" },
  { zip: "95129", name: "San Jose (West San Jose)", state: "CA", tier: "premium" },
  { zip: "94086", name: "Sunnyvale (Downtown)", state: "CA", tier: "premium" },
  { zip: "95050", name: "Santa Clara (Central)", state: "CA", tier: "mid" },
  { zip: "94301", name: "Palo Alto (Downtown)", state: "CA", tier: "premium" },
  { zip: "94306", name: "Palo Alto (South)", state: "CA", tier: "premium" },
  { zip: "94040", name: "Mountain View (Downtown)", state: "CA", tier: "premium" },
  { zip: "95014", name: "Cupertino", state: "CA", tier: "premium" },
  { zip: "95008", name: "Campbell", state: "CA", tier: "mid" },
  { zip: "95030", name: "Los Gatos", state: "CA", tier: "premium" },
  { zip: "95035", name: "Milpitas", state: "CA", tier: "mid" },
];

const ORLANDO_SEEDS: ZipSeed[] = [
  { zip: "32801", name: "Orlando (Downtown)", state: "FL", tier: "premium" },
  { zip: "32803", name: "Orlando (Colonialtown)", state: "FL", tier: "mid" },
  { zip: "32804", name: "Orlando (College Park)", state: "FL", tier: "mid" },
  { zip: "32805", name: "Orlando (Holden Heights)", state: "FL", tier: "value" },
  { zip: "32806", name: "Orlando (Bellevue Heights)", state: "FL", tier: "value" },
  { zip: "32807", name: "Orlando (Azalea Park)", state: "FL", tier: "value" },
  { zip: "32814", name: "Orlando (Lake Como)", state: "FL", tier: "mid" },
  { zip: "32819", name: "Orlando (Doctor Phillips)", state: "FL", tier: "premium" },
  { zip: "32822", name: "Orlando (South Orlando)", state: "FL", tier: "value" },
  { zip: "32825", name: "Orlando (Union Park)", state: "FL", tier: "mid" },
  { zip: "32828", name: "Orlando (Alafaya)", state: "FL", tier: "mid" },
  { zip: "32832", name: "Orlando (Lake Nona)", state: "FL", tier: "premium" },
  { zip: "32835", name: "Orlando (MetroWest)", state: "FL", tier: "mid" },
  { zip: "32789", name: "Winter Park", state: "FL", tier: "premium" },
  { zip: "34741", name: "Kissimmee", state: "FL", tier: "value" },
  { zip: "34747", name: "Celebration", state: "FL", tier: "premium" },
];

function tierDefaults(tier: ZipSeed["tier"]) {
  if (tier === "premium") {
    return {
      medianHomeValue: 620000,
      homeValueGrowthYoy: 2.8,
      homePriceForecast1yr: 2.0,
      overvaluationPct: 8.0,
      capRate: 4.5,
      daysOnMarket: 24,
      sellerDesperationScore: 18,
      marketPsf: 520,
      remoteWorkPct: 36.0,
      homeowners25to44Pct: 40.0,
      populationGrowthRate: 1.5,
      incomeGrowthRate: 4.0,
      medianAge: 35.0,
      walkabilityScore: 72,
      collegeDegreeRate: 58.0,
    };
  }
  if (tier === "mid") {
    return {
      medianHomeValue: 420000,
      homeValueGrowthYoy: 2.2,
      homePriceForecast1yr: 1.5,
      overvaluationPct: 4.0,
      capRate: 5.2,
      daysOnMarket: 32,
      sellerDesperationScore: 26,
      marketPsf: 380,
      remoteWorkPct: 30.0,
      homeowners25to44Pct: 36.0,
      populationGrowthRate: 1.2,
      incomeGrowthRate: 3.5,
      medianAge: 36.5,
      walkabilityScore: 55,
      collegeDegreeRate: 42.0,
    };
  }
  return {
    medianHomeValue: 310000,
    homeValueGrowthYoy: 1.2,
    homePriceForecast1yr: 0.8,
    overvaluationPct: -2.0,
    capRate: 5.8,
    daysOnMarket: 42,
    sellerDesperationScore: 34,
    marketPsf: 260,
    remoteWorkPct: 24.0,
    homeowners25to44Pct: 30.0,
    populationGrowthRate: 0.8,
    incomeGrowthRate: 2.8,
    medianAge: 38.0,
    walkabilityScore: 42,
    collegeDegreeRate: 32.0,
  };
}

function buildZip(seed: ZipSeed): ZipMetricsInput {
  const d = tierDefaults(seed.tier);
  const jitter = (n: number, spread: number) => Math.round((n + (seed.zip.charCodeAt(4) % spread) - spread / 2) * 10) / 10;

  return {
    zip: seed.zip,
    name: seed.name,
    state: seed.state,
    homePriceForecast1yr: jitter(d.homePriceForecast1yr, 2),
    overvaluationPct: jitter(d.overvaluationPct, 4),
    capRate: jitter(d.capRate, 0.6),
    daysOnMarket: Math.round(d.daysOnMarket + (seed.zip.charCodeAt(3) % 8)),
    sellerDesperationScore: Math.round(d.sellerDesperationScore + (seed.zip.charCodeAt(2) % 10)),
    marketPsf: Math.round(d.marketPsf + (seed.zip.charCodeAt(1) % 40)),
    homeValueGrowthYoy: jitter(d.homeValueGrowthYoy, 2),
    medianHomeValue: Math.round(d.medianHomeValue + (seed.zip.charCodeAt(0) % 50) * 1000),
    priceCutCount: seed.tier === "value" ? 2 : seed.tier === "mid" ? 1 : 0,
    remoteWorkPct: jitter(d.remoteWorkPct, 6),
    homeowners25to44Pct: jitter(d.homeowners25to44Pct, 5),
    populationGrowthRate: jitter(d.populationGrowthRate, 1),
    incomeGrowthRate: jitter(d.incomeGrowthRate, 1),
    medianAge: jitter(d.medianAge, 2),
    walkabilityScore: Math.round(d.walkabilityScore + (seed.zip.charCodeAt(4) % 12)),
    collegeDegreeRate: jitter(d.collegeDegreeRate, 6),
    ...deriveExtendedMetrics(
      seed.zip,
      Math.round(d.walkabilityScore + (seed.zip.charCodeAt(4) % 12)),
    ),
  };
}

function assertSeeds(seeds: ZipSeed[], expected: readonly string[]) {
  const zips = seeds.map((s) => s.zip);
  for (const zip of expected) {
    if (!zips.includes(zip)) throw new Error(`Missing seed for ${zip}`);
  }
}

assertSeeds(DC_SEEDS, SANDBOX_ZIPS);
assertSeeds(ORLANDO_SEEDS, ORLANDO_SANDBOX_ZIPS);
assertSeeds(SF_BAY_SEEDS, SF_BAY_SANDBOX_ZIPS);
assertSeeds(SAN_JOSE_SEEDS, SAN_JOSE_SANDBOX_ZIPS);

const dcCollection = {
  metro: "Washington-Arlington-Alexandria MSA",
  updatedAt: "2026-07-11",
  zips: DC_SEEDS.map(buildZip),
};

const orlandoCollection = {
  metro: "Orlando-Kissimmee-Sanford MSA",
  cbsaCode: "36740",
  updatedAt: "2026-07-11",
  zips: ORLANDO_SEEDS.map(buildZip),
};

const sfBayCollection = {
  metro: "San Francisco-Oakland-Berkeley MSA",
  cbsaCode: "41860",
  updatedAt: "2026-07-11",
  zips: SF_BAY_SEEDS.map(buildZip),
};

const sanJoseCollection = {
  metro: "San Jose-Sunnyvale-Santa Clara MSA",
  cbsaCode: "41940",
  updatedAt: "2026-07-11",
  zips: SAN_JOSE_SEEDS.map(buildZip),
};

writeFileSync(resolve(MOCK_DIR, "zip-metrics.json"), `${JSON.stringify(dcCollection, null, 2)}\n`, "utf8");
writeFileSync(resolve(MOCK_DIR, "orlando-zip-metrics.json"), `${JSON.stringify(orlandoCollection, null, 2)}\n`, "utf8");
writeFileSync(resolve(MOCK_DIR, "sf-bay-zip-metrics.json"), `${JSON.stringify(sfBayCollection, null, 2)}\n`, "utf8");
writeFileSync(resolve(MOCK_DIR, "san-jose-zip-metrics.json"), `${JSON.stringify(sanJoseCollection, null, 2)}\n`, "utf8");

function buildQuotes(seeds: ZipSeed[], source: string) {
  return {
    quotes: seeds.map((s) => ({
      zip: s.zip,
      neighborhood: s.name,
      text: `Representative neighborhood vibe for ${s.name} — locale quotes pending curation.`,
      source,
      primaryVibe: s.name.split("(")[1]?.replace(")", "").trim() ?? s.name,
    })),
  };
}

writeFileSync(resolve(MOCK_DIR, "locale-quotes.json"), `${JSON.stringify(buildQuotes(DC_SEEDS, "r/washingtondc"), null, 2)}\n`, "utf8");
writeFileSync(resolve(MOCK_DIR, "orlando-locale-quotes.json"), `${JSON.stringify(buildQuotes(ORLANDO_SEEDS, "r/orlando"), null, 2)}\n`, "utf8");
writeFileSync(resolve(MOCK_DIR, "sf-bay-locale-quotes.json"), `${JSON.stringify(buildQuotes(SF_BAY_SEEDS, "r/sanfrancisco"), null, 2)}\n`, "utf8");
writeFileSync(resolve(MOCK_DIR, "san-jose-locale-quotes.json"), `${JSON.stringify(buildQuotes(SAN_JOSE_SEEDS, "r/SanJose"), null, 2)}\n`, "utf8");

console.info(`Wrote zip-metrics.json (${dcCollection.zips.length} ZIPs)`);
console.info(`Wrote orlando-zip-metrics.json (${orlandoCollection.zips.length} ZIPs)`);
console.info(`Wrote sf-bay-zip-metrics.json (${sfBayCollection.zips.length} ZIPs)`);
console.info(`Wrote san-jose-zip-metrics.json (${sanJoseCollection.zips.length} ZIPs)`);
