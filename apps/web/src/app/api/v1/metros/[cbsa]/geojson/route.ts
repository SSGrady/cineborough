import { NextResponse } from "next/server";
import { loadMetroShard } from "@cineborough/data";

const CBSA_PATTERN = /^\d{5}$/;

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

  const shard = loadMetroShard(cbsa);
  if (shard) {
    return NextResponse.json(shard);
  }

  return NextResponse.json(
    { fallback: "national-tile-only" },
    { status: 404 },
  );
}
