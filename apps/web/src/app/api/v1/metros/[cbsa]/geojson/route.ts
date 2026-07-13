import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DcMetroGeoJson } from "@cineborough/data";

const CBSA_PATTERN = /^\d{5}$/;
const METROS_DIR = resolve(process.cwd(), "../../data/metros");

/** Server route reads shards from disk only — avoids bundling geojson into webpack chunks. */
function loadShardFromDisk(cbsa: string): DcMetroGeoJson | undefined {
  const path = resolve(METROS_DIR, `${cbsa}.geojson`);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as DcMetroGeoJson;
  } catch {
    return undefined;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cbsa: string }> },
) {
  const { cbsa } = await params;

  if (!CBSA_PATTERN.test(cbsa)) {
    return NextResponse.json(
      { fallback: "national-tile-only" },
      { status: 404 },
    );
  }

  const onDisk = loadShardFromDisk(cbsa);
  if (onDisk) {
    return NextResponse.json(onDisk, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  return NextResponse.json(
    { fallback: "national-tile-only" },
    { status: 404 },
  );
}
