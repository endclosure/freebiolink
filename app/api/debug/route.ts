import { NextResponse } from "next/server";
import { kvConfigured, githubStoreConfigured, persistent } from "@/app/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const backend = kvConfigured()
    ? "upstash"
    : githubStoreConfigured()
      ? "github"
      : "memory";

  const result = {
    backend,
    env: {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? "set" : "MISSING",
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? "set" : "MISSING",
      KV_REST_API_URL: process.env.KV_REST_API_URL ? "set" : "MISSING",
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "set" : "MISSING",
      GITHUB_TOKEN: process.env.GITHUB_TOKEN ? "set" : "MISSING",
      GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER ?? "MISSING",
      GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME ?? "MISSING",
    },
    steps: [] as string[],
    errors: [] as string[],
  };

  if (backend === "memory") {
    result.errors.push(
      "No durable store configured. Add Upstash Redis (recommended for Vercel) or GitHub store env vars.",
    );
    return NextResponse.json(result, { status: 200 });
  }

  try {
    const probeKey = "debug:probe";
    const stamp = Date.now();
    await persistent.set(probeKey, { ok: true, stamp });
    result.steps.push(`wrote ${probeKey}`);

    const read = await persistent.get<{ ok: boolean; stamp: number }>(probeKey);
    result.steps.push(`read back: ${JSON.stringify(read)}`);

    if (!read || read.stamp !== stamp) {
      result.errors.push("Readback mismatch");
    } else {
      result.steps.push("Write/read test passed");
    }

    await persistent.delete(probeKey);
    result.steps.push("cleaned probe key");
  } catch (err) {
    result.errors.push(`Storage error: ${String(err)}`);
  }

  return NextResponse.json(result, { status: 200 });
}
