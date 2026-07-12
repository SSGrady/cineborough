import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MetroCatalog, MetroCatalogEntry, MetroZipEntry } from "./types.ts";
import type { ZhviNormalizedBundle, ZhviZipRecord } from "../ingest/zhvi-sources.ts";
import {
  CBSA_BOUNDARIES_PATH,
  CATALOG_DIR,
  CATALOG_PATH,
  REPO_ROOT,
  ZHVI_ZIP_PATH,
} from "./paths.ts";
import {
  isSandboxCbsa,
  sandboxConfigFor,
  SANDBOX_METRO_CONFIGS,
} from "./sandbox-config.ts";
import { buildZhviMetroRegionMap, resolveZhviMetroRegionId } from "./zhvi-lookup.ts";

interface CbsaFeature {
  type: "Feature";
  properties: {
    GEOID: string;
    NAME: string;
    LSAD: string;
  };
}

function lsadToMetroType(lsad: string): MetroCatalogEntry["metroType"] {
  if (lsad === "M1") return "msa";
  if (lsad === "M2") return "micro";
  return "other";
}

function loadSandboxZipEntries(cbsaCode: string): MetroZipEntry[] {
  const config = sandboxConfigFor(cbsaCode);
  if (!config) return [];

  const metrics = JSON.parse(
    readFileSync(resolve(REPO_ROOT, config.metricsPath), "utf8"),
  ) as {
    zips: Array<{ zip: string; name: string; state: string }>;
  };

  return metrics.zips.map((z) => ({
    zip: z.zip,
    name: z.name,
    state: z.state,
  }));
}

function buildZhviZipIndex(zhviZip: ZhviNormalizedBundle): Map<string, ZhviZipRecord[]> {
  const byMetro = new Map<string, ZhviZipRecord[]>();
  for (const record of Object.values(zhviZip.records) as ZhviZipRecord[]) {
    const metro = record.metro?.trim();
    if (!metro) continue;
    const list = byMetro.get(metro) ?? [];
    list.push(record);
    byMetro.set(metro, list);
  }
  return byMetro;
}

function normalizeMetroName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+msa$/i, "")
    .replace(/\s+metro$/i, "")
    .replace(/[,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Primary corridor token before state suffix — e.g. "Miami-Fort Lauderdale" */
function metroStem(name: string): string {
  const base = name.split(",")[0].trim();
  const parts = base.split("-");
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`.toLowerCase();
  return parts[0].toLowerCase();
}

/**
 * Census CBSA names and ZHVI metro names diverge on suburb tokens (Roswell vs Alpharetta).
 * Match on shared stem when exact NAME equality fails.
 */
function zhviMetroKeyForCbsa(cbsaName: string, zhviByMetro: Map<string, ZhviZipRecord[]>): string | null {
  if (zhviByMetro.has(cbsaName)) return cbsaName;

  const stem = metroStem(cbsaName);
  for (const zhviMetro of zhviByMetro.keys()) {
    if (metroStem(zhviMetro) === stem) return zhviMetro;
  }

  const normalized = normalizeMetroName(cbsaName);
  for (const zhviMetro of zhviByMetro.keys()) {
    const zhviNorm = normalizeMetroName(zhviMetro);
    if (zhviNorm.startsWith(normalized.split(" ")[0]) && zhviNorm.includes(stem.split("-")[0])) {
      return zhviMetro;
    }
  }

  return null;
}

function zipsFromZhviMetro(
  cbsaName: string,
  zhviByMetro: Map<string, ZhviZipRecord[]>,
): MetroZipEntry[] {
  const key = zhviMetroKeyForCbsa(cbsaName, zhviByMetro);
  if (!key) return [];

  const direct = zhviByMetro.get(key) ?? [];
  return direct
    .map((r) => ({
      zip: r.zipCode,
      name: r.city || `ZCTA ${r.zipCode}`,
      state: r.state,
    }))
    .sort((a, b) => a.zip.localeCompare(b.zip));
}

export function buildMetroCatalog(): MetroCatalog {
  const boundaries = JSON.parse(readFileSync(CBSA_BOUNDARIES_PATH, "utf8")) as {
    features: CbsaFeature[];
  };
  const zhviZip = JSON.parse(readFileSync(ZHVI_ZIP_PATH, "utf8")) as ZhviNormalizedBundle;
  const zhviByMetro = buildZhviZipIndex(zhviZip);
  const zhviMetroByName = buildZhviMetroRegionMap();

  const metros: MetroCatalogEntry[] = [];

  for (const feature of boundaries.features) {
    const cbsaCode = feature.properties.GEOID;
    const name = feature.properties.NAME;
    const lsad = feature.properties.LSAD;

    let zips: MetroZipEntry[];
    let isSandbox = false;

    if (isSandboxCbsa(cbsaCode)) {
      zips = loadSandboxZipEntries(cbsaCode);
      isSandbox = true;
    } else {
      zips = zipsFromZhviMetro(name, zhviByMetro);
    }

    metros.push({
      cbsaCode,
      name,
      lsad,
      metroType: lsadToMetroType(lsad),
      zipCount: zips.length,
      zips,
      zhviMetroRegionId: resolveZhviMetroRegionId(name, zhviMetroByName),
      isSandbox,
    });
  }

  metros.sort((a, b) => a.cbsaCode.localeCompare(b.cbsaCode));

  const totalZips = metros.reduce((sum, m) => sum + m.zipCount, 0);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source:
      "Census CBSA boundaries (cbsa-boundaries-20m.geojson) + ZHVI zip metro field crosswalk; sandbox CBSAs use curated lists",
    totalMetros: metros.length,
    totalZips,
    metros,
  };
}

export function writeMetroCatalog(catalog?: MetroCatalog): MetroCatalog {
  const result = catalog ?? buildMetroCatalog();
  mkdirSync(CATALOG_DIR, { recursive: true });
  writeFileSync(CATALOG_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

export function loadMetroCatalog(): MetroCatalog {
  if (!existsSync(CATALOG_PATH)) {
    return writeMetroCatalog();
  }
  return JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as MetroCatalog;
}

export function catalogEntryFor(cbsaCode: string, catalog?: MetroCatalog): MetroCatalogEntry | undefined {
  const cat = catalog ?? loadMetroCatalog();
  return cat.metros.find((m) => m.cbsaCode === cbsaCode);
}

/** Metros with at least one ZCTA — eligible for shard ingest. */
export function ingestibleMetros(catalog?: MetroCatalog): MetroCatalogEntry[] {
  const cat = catalog ?? loadMetroCatalog();
  return cat.metros.filter((m) => m.zipCount > 0);
}

export function sandboxMetroCount(): number {
  return SANDBOX_METRO_CONFIGS.length;
}
