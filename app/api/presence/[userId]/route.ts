import { NextResponse } from "next/server";
import redis from "@/app/lib/redis";
import type { PresenceResponse } from "@/app/lib/presence/types";
import { getCachedPresenceData, fetchLanyardData, storePresenceData } from "@/app/lib/presence/service";

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const cached = await getCachedPresenceData(redis, userId);
  let { current, lastSpotify, lastGame, lastStatus } = cached;

  try {
    const fresh = await fetchLanyardData(userId);
    if (fresh) {
      current = fresh;
      const stored = await storePresenceData(redis, userId, fresh);
      if (stored.lastSpotify) lastSpotify = stored.lastSpotify;
      if (stored.lastGame) lastGame = stored.lastGame;
      if (stored.lastStatus) lastStatus = stored.lastStatus;
    }
  } catch (e) {
    console.error("Error fetching presence:", e);
  }

  if (!current) return NextResponse.json({ error: "no data" }, { status: 502 });

  const body: PresenceResponse = { current, lastSpotify, lastGame, lastStatus };
  return NextResponse.json(body);
}
