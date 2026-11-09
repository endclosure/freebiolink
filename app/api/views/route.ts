import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { persistent, ephemeral } from "@/app/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIEWS_KEY = "views:count";
const SEEN_PREFIX = "views:seen:";
const SEEN_COOKIE = "views_seen";

const VIEW_WINDOW_SECONDS = 60 * 60 * 12;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  if (firstForwarded) return firstForwarded;

  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "local"
  );
}

function visitorKey(request: Request): string {
  const salt = process.env.VIEWS_SALT ?? "views";
  const hash = createHash("sha256")
    .update(`${getClientIp(request)}:${salt}`)
    .digest("hex")
    .slice(0, 32);
  return `${SEEN_PREFIX}${hash}`;
}

function hasSeenCookie(request: Request): boolean {
  const header = request.headers.get("cookie");
  if (!header) return false;
  return header.split(";").some((part) => part.trim() === `${SEEN_COOKIE}=1`);
}

async function readCount(): Promise<number> {
  const value = await persistent.get<number | string>(VIEWS_KEY);
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) ? count : 0;
}

export async function GET(request: Request) {
  try {
    const key = visitorKey(request);
    const alreadyCounted = Boolean(await ephemeral.get(key));
    const shouldCount = !alreadyCounted && !hasSeenCookie(request);

    let count: number;
    if (shouldCount) {
      count = await persistent.incr(VIEWS_KEY, 1);
      await ephemeral.set(key, "1", "EX", VIEW_WINDOW_SECONDS);
    } else {
      count = await readCount();
    }

    const response = NextResponse.json({ count });
    response.headers.set("Cache-Control", "no-store");

    if (shouldCount) {
      response.cookies.set(SEEN_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: VIEW_WINDOW_SECONDS,
      });
    }

    return response;
  } catch (error) {
    console.error("Failed to update views:", error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
