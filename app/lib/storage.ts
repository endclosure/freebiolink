import redis from "@/app/lib/redis";
import { getKv, kvConfigured } from "@/app/lib/kv";
import {
  ghGet,
  ghSet,
  ghDelete,
  ghIncr,
  ghMutate,
  githubStoreConfigured,
} from "@/app/lib/github-store";

const memoryPersistent = new Map<string, unknown>();

type PersistentStore = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;
  incr: (key: string, by?: number) => Promise<number>;
  mutate: <T>(key: string, mutator: (current: T | null) => T) => Promise<T>;
};

async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const kv = getKv();
  if (!kv) return null;
  const value = await kv.get<T>(key);
  return value ?? null;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.set(key, value);
}

async function kvDelete(key: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.del(key);
}

async function kvIncr(key: string, by = 1): Promise<number> {
  const kv = getKv();
  if (!kv) return by;
  if (by === 1) return kv.incr(key);
  return kv.incrby(key, by);
}

async function kvMutate<T>(key: string, mutator: (current: T | null) => T): Promise<T> {
  const kv = getKv();
  if (!kv) return mutator(null);

  const current = (await kv.get<T>(key)) ?? null;
  const next = mutator(current);
  await kv.set(key, next);
  return next;
}

const kvBackend: PersistentStore = {
  get: kvGet,
  set: kvSet,
  delete: kvDelete,
  incr: kvIncr,
  mutate: kvMutate,
};

const githubBackend: PersistentStore = {
  get: ghGet,
  set: ghSet,
  delete: ghDelete,
  incr: ghIncr,
  mutate: ghMutate,
};

const memoryBackend: PersistentStore = {
  async get<T = unknown>(key: string): Promise<T | null> {
    return (memoryPersistent.get(key) as T) ?? null;
  },
  async set(key: string, value: unknown): Promise<void> {
    memoryPersistent.set(key, value);
  },
  async delete(key: string): Promise<void> {
    memoryPersistent.delete(key);
  },
  async incr(key: string, by = 1): Promise<number> {
    const current = Number(memoryPersistent.get(key) ?? 0);
    const next = current + by;
    memoryPersistent.set(key, next);
    return next;
  },
  async mutate<T>(key: string, mutator: (current: T | null) => T): Promise<T> {
    const current = (memoryPersistent.get(key) as T) ?? null;
    const next = mutator(current);
    memoryPersistent.set(key, next);
    return next;
  },
};

function resolvePersistent(): PersistentStore {
  if (kvConfigured()) return kvBackend;
  if (githubStoreConfigured()) return githubBackend;
  return memoryBackend;
}

export const persistent: PersistentStore = {
  get: (key) => resolvePersistent().get(key),
  set: (key, value) => resolvePersistent().set(key, value),
  delete: (key) => resolvePersistent().delete(key),
  incr: (key, by) => resolvePersistent().incr(key, by),
  mutate: (key, mutator) => resolvePersistent().mutate(key, mutator),
};

export const ephemeral = {
  get: (key: string) => redis.get(key),
  set: (key: string, value: string, mode?: string, duration?: number) =>
    redis.set(key, value, mode, duration),
  del: (key: string) => redis.del(key),
  incr: (key: string) => redis.incr(key),
  lpush: (key: string, ...values: string[]) => redis.lpush(key, ...values),
  ltrim: (key: string, start: number, stop: number) =>
    redis.ltrim(key, start, stop),
  lrange: (key: string, start: number, stop: number) =>
    redis.lrange(key, start, stop),
};

export { redis, kvConfigured, githubStoreConfigured };
export default { persistent, ephemeral, redis };
