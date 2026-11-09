import { NextResponse } from "next/server";
import redis from "@/app/lib/redis";
import { getRedisKeys } from "@/app/lib/presence/constants";
import type { StoredSpotify } from "@/app/lib/presence/types";

const USER_ID = "1447292903654428733";

export async function GET() {
  const keys = getRedisKeys(USER_ID);
  try {
    const raw = await redis.lrange(keys.spotifyHistory, 0, 19);
    const tracks = raw.map((r) => JSON.parse(r) as StoredSpotify);
    return NextResponse.json(tracks);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
