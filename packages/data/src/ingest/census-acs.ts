/**
 * ACS 5-year variable IDs for hope-core demographics (ADR-012 / T032).
 * @see https://api.census.gov/data/2023/acs/acs5/variables.html
 */
export const ACS_VINTAGE_CURRENT = "2023";
export const ACS_VINTAGE_PRIOR = "2022";

export const ACS_HOPE_CORE_VARIABLES = [
  "B01003_001E", // total population
  "B01002_001E", // median age
  "B08301_001E", // workers 16+
  "B08301_021E", // worked from home
  "B15003_001E", // population 25+
  "B15003_022E", // bachelor's
  "B15003_023E", // master's
  "B15003_024E", // professional
  "B15003_025E", // doctorate
  "B25003_002E", // owner-occupied units
  "B25007_004E", // owner householder 25-34
  "B25007_005E", // owner householder 35-44
] as const;

export const ACS_ATTRIBUTION =
  "Demographics from U.S. Census Bureau American Community Survey 5-Year Estimates.";

export interface CensusAcsRawRow {
  zipCode: string;
  name: string;
  population: number | null;
  medianAge: number | null;
  workers16Plus: number | null;
  workedFromHome: number | null;
  population25Plus: number | null;
  bachelors: number | null;
  masters: number | null;
  professional: number | null;
  doctorate: number | null;
  ownerOccupied: number | null;
  owner25to34: number | null;
  owner35to44: number | null;
}

export interface CensusZipDemographics {
  zipCode: string;
  name: string;
  population: number;
  medianAge: number;
  remoteWorkPct: number;
  homeowners25to44Pct: number;
  collegeDegreeRate: number;
  populationGrowthRate: number;
}

function parseAcsNumber(value: string | undefined): number | null {
  if (value === undefined || value === "" || value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeHopeCoreFromAcs(
  current: CensusAcsRawRow,
  priorPopulation: number | null,
): CensusZipDemographics | null {
  const population = current.population;
  const medianAge = current.medianAge;
  if (population === null || medianAge === null) return null;

  const remote = pct(current.workedFromHome, current.workers16Plus);
  const homeowners2544 = pct(
    (current.owner25to34 ?? 0) + (current.owner35to44 ?? 0),
    current.ownerOccupied,
  );
  const college = pct(
    (current.bachelors ?? 0) +
      (current.masters ?? 0) +
      (current.professional ?? 0) +
      (current.doctorate ?? 0),
    current.population25Plus,
  );

  let populationGrowthRate: number | null = null;
  if (priorPopulation !== null && priorPopulation > 0) {
    populationGrowthRate = ((population - priorPopulation) / priorPopulation) * 100;
  }

  if (remote === null || homeowners2544 === null || college === null || populationGrowthRate === null) {
    return null;
  }

  return {
    zipCode: current.zipCode,
    name: current.name,
    population,
    medianAge: round1(medianAge),
    remoteWorkPct: round1(remote),
    homeowners25to44Pct: round1(homeowners2544),
    collegeDegreeRate: round1(college),
    populationGrowthRate: round1(populationGrowthRate),
  };
}

export interface CensusAcsNormalizedBundle {
  source: "census-acs-5year";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  priorVintage: string;
  recordCount: number;
  records: Record<string, CensusZipDemographics>;
}

export function parseAcsApiRow(headers: string[], row: string[]): CensusAcsRawRow | null {
  const idx = (name: string) => headers.indexOf(name);
  const zipIdx = idx("zip code tabulation area");
  if (zipIdx < 0) return null;

  const zipCode = row[zipIdx]?.padStart(5, "0");
  if (!/^\d{5}$/.test(zipCode)) return null;

  return {
    zipCode,
    name: row[idx("NAME")] ?? zipCode,
    population: parseAcsNumber(row[idx("B01003_001E")]),
    medianAge: parseAcsNumber(row[idx("B01002_001E")]),
    workers16Plus: parseAcsNumber(row[idx("B08301_001E")]),
    workedFromHome: parseAcsNumber(row[idx("B08301_021E")]),
    population25Plus: parseAcsNumber(row[idx("B15003_001E")]),
    bachelors: parseAcsNumber(row[idx("B15003_022E")]),
    masters: parseAcsNumber(row[idx("B15003_023E")]),
    professional: parseAcsNumber(row[idx("B15003_024E")]),
    doctorate: parseAcsNumber(row[idx("B15003_025E")]),
    ownerOccupied: parseAcsNumber(row[idx("B25003_002E")]),
    owner25to34: parseAcsNumber(row[idx("B25007_004E")]),
    owner35to44: parseAcsNumber(row[idx("B25007_005E")]),
  };
}
