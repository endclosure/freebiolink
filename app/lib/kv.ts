import { Redis } from "@upstash/redis";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function kvConfigured(): boolean {
  return Boolean(
    (env("UPSTASH_REDIS_REST_URL") && env("UPSTASH_REDIS_REST_TOKEN")) ||
      (env("KV_REST_API_URL") && env("KV_REST_API_TOKEN")),
  );
}

declare global {
  // eslint-disable-next-line no-var
  var _upstashRedis: Redis | undefined;
}

export function getKv(): Redis | null {
  if (!kvConfigured()) return null;

  if (!globalThis._upstashRedis) {
    globalThis._upstashRedis = new Redis({
      url: env("UPSTASH_REDIS_REST_URL") ?? env("KV_REST_API_URL")!,
      token: env("UPSTASH_REDIS_REST_TOKEN") ?? env("KV_REST_API_TOKEN")!,
    });
  }

  return globalThis._upstashRedis;
}
