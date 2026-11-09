import type { LanyardData, StoredSpotify, StoredGame, StoredStatus } from "./types";
import { LANYARD_API_BASE, CURRENT_TTL, LAST_TTL, SPOTIFY_HISTORY_MAX, getRedisKeys } from "./constants";
import { findGameActivity } from "./utils";

export type LanyardResponse = { success: boolean; data?: LanyardData };

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLanyardData(userId: string, maxRetries = 2): Promise<LanyardData | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${LANYARD_API_BASE}/users/${userId}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status >= 500 && attempt < maxRetries - 1) { await sleep(Math.min(1000 * 2 ** attempt, 3000)); continue; }
        return null;
      }
      const payload = (await res.json()) as LanyardResponse;
      return payload.success && payload.data ? payload.data : null;
    } catch {
      if (attempt < maxRetries - 1) await sleep(Math.min(1000 * 2 ** attempt, 3000));
    }
  }
  return null;
}

export async function storePresenceData(redis: any, userId: string, current: LanyardData) {
  const keys = getRedisKeys(userId);
  try { await redis.set(keys.current, JSON.stringify(current), "EX", CURRENT_TTL); } catch {}

  let lastSpotify: StoredSpotify | null = null;
  let lastGame: StoredGame | null = null;
  let lastStatus: StoredStatus | null = null;

  if (current.listening_to_spotify && current.spotify) {
    lastSpotify = { song: current.spotify.song, artist: current.spotify.artist, album_art_url: current.spotify.album_art_url, track_id: current.spotify.track_id, seenAt: Date.now() };
    try { await redis.set(keys.spotify, JSON.stringify(lastSpotify), "EX", LAST_TTL); } catch {}


    try {
      const head = await redis.lrange(keys.spotifyHistory, 0, 0);
      const headTrack = head[0] ? (JSON.parse(head[0]) as StoredSpotify) : null;
      if (!headTrack || headTrack.track_id !== lastSpotify.track_id) {
        await redis.lpush(keys.spotifyHistory, JSON.stringify(lastSpotify));
        await redis.ltrim(keys.spotifyHistory, 0, SPOTIFY_HISTORY_MAX - 1);
      }
    } catch {}
  }

  const game = findGameActivity(current.activities);
  if (game && current.discord_status !== "offline") {
    lastGame = { name: game.name, details: game.details, state: game.state, seenAt: Date.now() };
    try { await redis.set(keys.game, JSON.stringify(lastGame), "EX", LAST_TTL); } catch {}
  }

  if (current.discord_status !== "offline") {
    lastStatus = { status: current.discord_status, seenAt: Date.now() };
    try { await redis.set(keys.status, JSON.stringify(lastStatus), "EX", LAST_TTL); } catch {}
  }

  return { lastSpotify, lastGame, lastStatus };
}

export async function getCachedPresenceData(redis: any, userId: string) {
  const keys = getRedisKeys(userId);
  try {
    const [c, s, g, st] = await Promise.all([redis.get(keys.current), redis.get(keys.spotify), redis.get(keys.game), redis.get(keys.status)]);
    return {
      current:     c  ? (JSON.parse(c)  as LanyardData)    : null,
      lastSpotify: s  ? (JSON.parse(s)  as StoredSpotify)  : null,
      lastGame:    g  ? (JSON.parse(g)  as StoredGame)     : null,
      lastStatus:  st ? (JSON.parse(st) as StoredStatus)   : null,
    };
  } catch {
    return { current: null, lastSpotify: null, lastGame: null, lastStatus: null };
  }
}
