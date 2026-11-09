import { getKv, kvConfigured } from "@/app/lib/kv";

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<string>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

const memoryStore = new Map<string, MemoryEntry>();
const listStore = new Map<string, string[]>();

class SafeMemoryRedis implements RedisClient {
  async get(key: string): Promise<string | null> {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    const expiresAt = mode === "EX" && duration ? Date.now() + duration * 1000 : Infinity;
    memoryStore.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return memoryStore.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const entry = memoryStore.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + 1;
    memoryStore.set(key, { value: String(next), expiresAt: Infinity });
    return next;
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const list = listStore.get(key) ?? [];
    list.unshift(...values.reverse());
    listStore.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const list = listStore.get(key) ?? [];
    listStore.set(key, list.slice(start, stop + 1));
    return "OK";
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = listStore.get(key) ?? [];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  }
}

class UpstashRedisAdapter implements RedisClient {
  async get(key: string): Promise<string | null> {
    const kv = getKv();
    if (!kv) return null;
    const value = await kv.get<string | number | boolean | null>(key);
    if (value === null || value === undefined) return null;
    return typeof value === "string" ? value : String(value);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    const kv = getKv();
    if (!kv) return "OK";
    if (mode === "EX" && typeof duration === "number") {
      await kv.set(key, value, { ex: duration });
    } else {
      await kv.set(key, value);
    }
    return "OK";
  }

  async del(key: string): Promise<number> {
    const kv = getKv();
    if (!kv) return 0;
    return kv.del(key);
  }

  async incr(key: string): Promise<number> {
    const kv = getKv();
    if (!kv) return 0;
    return kv.incr(key);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const kv = getKv();
    if (!kv) return 0;
    return kv.lpush(key, ...values);
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const kv = getKv();
    if (!kv) return "OK";
    await kv.ltrim(key, start, stop);
    return "OK";
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const kv = getKv();
    if (!kv) return [];
    const values = await kv.lrange<string>(key, start, stop);
    return values.map((value) => (typeof value === "string" ? value : String(value)));
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _customRedis: RedisClient | undefined;
  // eslint-disable-next-line no-var
  var _resolvedRedis: RedisClient | undefined;
}

function createRedisClient(): RedisClient {
  if (kvConfigured()) {
    return new UpstashRedisAdapter();
  }

  if (process.env.REDIS_URL) {
    try {
      const RedisConstructor = require("ioredis");
      if (!globalThis._customRedis) {
        globalThis._customRedis = new RedisConstructor(process.env.REDIS_URL);
      }
      return globalThis._customRedis as RedisClient;
    } catch {
      return new SafeMemoryRedis();
    }
  }

  return new SafeMemoryRedis();
}

function getRedis(): RedisClient {
  // Prefer Upstash whenever it becomes available in this process.
  if (kvConfigured()) {
    if (!(globalThis._resolvedRedis instanceof UpstashRedisAdapter)) {
      globalThis._resolvedRedis = new UpstashRedisAdapter();
    }
    return globalThis._resolvedRedis;
  }

  if (!globalThis._resolvedRedis) {
    globalThis._resolvedRedis = createRedisClient();
  }
  return globalThis._resolvedRedis;
}

const redisInstance: RedisClient = {
  get: (key) => getRedis().get(key),
  set: (key, value, mode, duration) => getRedis().set(key, value, mode, duration),
  del: (key) => getRedis().del(key),
  incr: (key) => getRedis().incr(key),
  lpush: (key, ...values) => getRedis().lpush(key, ...values),
  ltrim: (key, start, stop) => getRedis().ltrim(key, start, stop),
  lrange: (key, start, stop) => getRedis().lrange(key, start, stop),
};

export default redisInstance;
