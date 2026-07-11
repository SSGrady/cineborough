/**
 * FHFA House Price Index bulk download URLs (ADR-012).
 * @see https://www.fhfa.gov/data/hpi/datasets
 */
export const FHFA_HPI_CSV_URL =
  "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_exp_metro.txt";

export const FHFA_ATTRIBUTION =
  "House price momentum from FHFA House Price Index bulk data (© FHFA).";

/** Sandbox CBSAs — see ADR-004 / E007 */
export const SANDBOX_CBSAS = ["47900", "36740", "41860"] as const;

/**
 * FHFA expanded-data metro file uses CBSA codes directly for most metros.
 * Washington-Arlington-Alexandria (47900) is split into MSADs in FHFA; we use
 * Arlington-Alexandria-Reston (11694) for the sandbox corridor (ADR-012).
 */
export const SANDBOX_CBSA_FHFA_MAP: Record<
  string,
  { fhfaMetroCode: string; label: string }
> = {
  "36740": {
    fhfaMetroCode: "36740",
    label: "Orlando-Kissimmee-Sanford, FL",
  },
  "47900": {
    fhfaMetroCode: "11694",
    label: "Arlington-Alexandria-Reston, VA-WV (MSAD)",
  },
  "41860": {
    fhfaMetroCode: "41860",
    label: "San Francisco-Oakland-Berkeley, CA",
  },
};

/** Zillow Research ZHVI metro regionId for sandbox CBSAs (from metro-latest.json). */
export const SANDBOX_CBSA_ZHVI_METRO_MAP: Record<string, string> = {
  "36740": "394943",
  "47900": "395209",
  "41860": "395057",
};

export interface FhfaHpiSeriesPoint {
  year: number;
  quarter: number;
  indexNsa: number;
  indexSa: number;
}

export interface FhfaMetroRecord {
  cbsaCode: string;
  fhfaMetroCode: string;
  name: string;
  indexNsa: number;
  indexSa: number;
  hpiYoyPct: number | null;
  hpiQoqPct: number | null;
  series: FhfaHpiSeriesPoint[];
}

export interface FhfaHpiNormalizedBundle {
  source: "fhfa-hpi-expanded-metro";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  recordCount: number;
  records: Record<string, FhfaMetroRecord>;
}
