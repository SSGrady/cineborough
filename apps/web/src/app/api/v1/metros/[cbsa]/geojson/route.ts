import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadMetroShard, type DcMetroGeoJson } from "@cineborough/data";

const CBSA_PATTERN = /^\d{5}$/;

function metroShardPath(cbsa: string): string {
  return resolve(process.cwd(), "../../data/metros", `${cbsa}.geojson`);
}

function loadShardFromDisk(cbsa: string): DcMetroGeoJson | undefined {
  const path = metroShardPath(cbsa);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as DcMetroGeoJson;
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

  const bundled = loadMetroShard(cbsa);
  if (bundled) {
    return NextResponse.json(bundled);
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
