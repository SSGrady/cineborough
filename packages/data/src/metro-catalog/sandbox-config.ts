/**
 * Curated sandbox ZIP lists — preserved exactly for nationwide ingest (ADR-013).
 * Non-sandbox metros use full ZHVI crosswalk ZCTAs per CBSA.
 */
import {
  SANDBOX_ZIPS,
  ORLANDO_SANDBOX_ZIPS,
  SF_BAY_SANDBOX_ZIPS,
  SAN_JOSE_SANDBOX_ZIPS,
} from "../validation.ts";

export const SANDBOX_CBSA_CODES = ["47900", "36740", "41860", "41940"] as const;
export type SandboxCbsaCode = (typeof SANDBOX_CBSA_CODES)[number];

export interface SandboxMetroConfig {
  cbsaCode: SandboxCbsaCode;
  metro: string;
  zips: readonly string[];
  metricsPath: string;
  boundariesPath: string;
  quotesPath: string;
  outputPath: string;
}

export const SANDBOX_METRO_CONFIGS: SandboxMetroConfig[] = [
  {
    cbsaCode: "47900",
    metro: "Washington-Arlington-Alexandria MSA",
    zips: SANDBOX_ZIPS,
    metricsPath: "data/mock/zip-metrics.json",
    boundariesPath: "data/mock/zip-boundaries.geojson",
    quotesPath: "data/mock/locale-quotes.json",
    outputPath: "data/metros/47900.geojson",
  },
  {
    cbsaCode: "36740",
    metro: "Orlando-Kissimmee-Sanford MSA",
    zips: ORLANDO_SANDBOX_ZIPS,
    metricsPath: "data/mock/orlando-zip-metrics.json",
    boundariesPath: "data/mock/orlando-zip-boundaries.geojson",
    quotesPath: "data/mock/orlando-locale-quotes.json",
    outputPath: "data/metros/36740.geojson",
  },
  {
    cbsaCode: "41860",
    metro: "San Francisco-Oakland-Berkeley MSA",
    zips: SF_BAY_SANDBOX_ZIPS,
    metricsPath: "data/mock/sf-bay-zip-metrics.json",
    boundariesPath: "data/mock/sf-bay-zip-boundaries.geojson",
    quotesPath: "data/mock/sf-bay-locale-quotes.json",
    outputPath: "data/metros/41860.geojson",
  },
  {
    cbsaCode: "41940",
    metro: "San Jose-Sunnyvale-Santa Clara MSA",
    zips: SAN_JOSE_SANDBOX_ZIPS,
    metricsPath: "data/mock/san-jose-zip-metrics.json",
    boundariesPath: "data/mock/san-jose-zip-boundaries.geojson",
    quotesPath: "data/mock/san-jose-locale-quotes.json",
    outputPath: "data/metros/41940.geojson",
  },
];

export function isSandboxCbsa(cbsaCode: string): cbsaCode is SandboxCbsaCode {
  return (SANDBOX_CBSA_CODES as readonly string[]).includes(cbsaCode);
}

export function sandboxConfigFor(cbsaCode: string): SandboxMetroConfig | undefined {
  return SANDBOX_METRO_CONFIGS.find((c) => c.cbsaCode === cbsaCode);
}
