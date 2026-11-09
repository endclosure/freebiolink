import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { persistent, ephemeral } from "@/app/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENTRIES_KEY = "guestbook:entries";
const SEEN_PREFIX = "guestbook:seen:";
const COOKIE_NAME = "guestbook_posted";
const COOLDOWN_SECONDS = 60 * 60 * 24 * 7;
const MAX_ENTRIES = 100;
const MAX_NAME = 32;
const MAX_MESSAGE = 50;

interface GuestBookEntry {
  id: string;
  name: string;
  message: string;
  createdAt: number;
}

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
  const salt = process.env.GUESTBOOK_SALT ?? "guestbook";
  const hash = createHash("sha256")
    .update(`${getClientIp(request)}:${salt}`)
    .digest("hex")
    .slice(0, 32);
  return `${SEEN_PREFIX}${hash}`;
}

function hasCookie(request: Request): boolean {
  const header = request.headers.get("cookie");
  if (!header) return false;
  return header.split(";").some((part) => part.trim() === `${COOKIE_NAME}=1`);
}

async function readEntries(): Promise<GuestBookEntry[]> {
  const entries = await persistent.get<GuestBookEntry[]>(ENTRIES_KEY);
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (e): e is GuestBookEntry =>
      typeof e.id === "string" &&
      typeof e.name === "string" &&
      typeof e.message === "string" &&
      typeof e.createdAt === "number",
  );
}

export async function GET(request: Request) {
  try {
    const entries = await readEntries();
    const blocked = hasCookie(request) || Boolean(await ephemeral.get(visitorKey(request)));
    const response = NextResponse.json({ entries, canPost: !blocked });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Failed to load guest book:", error);
    return NextResponse.json(
      { entries: [], canPost: true },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const key = visitorKey(request);

    if (hasCookie(request) || Boolean(await ephemeral.get(key))) {
      return NextResponse.json(
        { error: "You can sign the guest book once a week." },
        { status: 429 }
      );
    }

    const payload = (await request.json().catch(() => null)) as {
      name?: unknown;
      message?: unknown;
    } | null;

    const name =
      typeof payload?.name === "string" ? payload.name.trim().slice(0, MAX_NAME) : "";
    const message =
      typeof payload?.message === "string"
        ? payload.message.trim().slice(0, MAX_MESSAGE)
        : "";

    if (!name || !message) {
      return NextResponse.json(
        { error: "A name and a message are required." },
        { status: 400 }
      );
    }

    const entry: GuestBookEntry = {
      id: randomUUID(),
      name,
      message,
      createdAt: Date.now(),
    };

    const allEntries = await persistent.mutate<GuestBookEntry[]>(
      ENTRIES_KEY,
      (current) => {
        const list = Array.isArray(current) ? current : [];
        return [entry, ...list].slice(0, MAX_ENTRIES);
      },
    );

    await ephemeral.set(key, "1", "EX", COOLDOWN_SECONDS);

    const response = NextResponse.json(
      { entry, entries: allEntries ?? [], canPost: false },
      { status: 201 }
    );
    response.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOLDOWN_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Failed to save guest book entry:", error);
    return NextResponse.json({ error: "guest_book_unavailable" }, { status: 500 });
  }
}
