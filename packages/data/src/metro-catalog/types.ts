/** Nationwide metro catalog — CBSA → ZCTA neighborhood units (ADR-011 extension). */

export interface MetroZipEntry {
  zip: string;
  /** Display name — city from ZHVI or ZCTA label */
  name: string;
  state: string;
}

export interface MetroCatalogEntry {
  cbsaCode: string;
  name: string;
  /** Census LSAD: M1 = MSA, M2 = micropolitan */
  lsad: string;
  metroType: "msa" | "micro" | "other";
  zipCount: number;
  zips: MetroZipEntry[];
  /** Zillow Research ZHVI metro regionId when matched */
  zhviMetroRegionId?: string;
  /** True for DC/Orlando/SF/San Jose curated sandbox lists */
  isSandbox: boolean;
}

export interface MetroCatalog {
  version: number;
  generatedAt: string;
  source: string;
  totalMetros: number;
  totalZips: number;
  metros: MetroCatalogEntry[];
}

export interface IngestProgressEntry {
  cbsaCode: string;
  status: "pending" | "in_progress" | "done" | "failed" | "skipped";
  zipCount: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  shardPath?: string;
}

export interface IngestProgress {
  version: number;
  updatedAt: string;
  totalMetros: number;
  completedMetros: number;
  failedMetros: number;
  totalNeighborhoods: number;
  entries: Record<string, IngestProgressEntry>;
}
