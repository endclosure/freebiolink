const FILE_PATH = "data/store.json";
const API_BASE = "https://api.github.com";

interface CacheEntry {
  data: Record<string, unknown>;
  sha: string | null;
  fetchedAt: number;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function configured(): boolean {
  return Boolean(env("GITHUB_TOKEN") && env("GITHUB_REPO_OWNER") && env("GITHUB_REPO_NAME"));
}

function repoInfo() {
  return {
    token: env("GITHUB_TOKEN")!,
    owner: env("GITHUB_REPO_OWNER")!,
    repo: env("GITHUB_REPO_NAME")!,
    branch: env("GITHUB_REPO_BRANCH") ?? "main",
  };
}

const memoryStore = new Map<string, unknown>();

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 10_000;

let inflight: Promise<CacheEntry> | null = null;

async function ensureData(): Promise<CacheEntry> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = fetchData().finally(() => (inflight = null));
  return inflight;
}

async function fetchData(): Promise<CacheEntry> {
  if (!configured()) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of memoryStore) data[k] = v;
    return { data, sha: null, fetchedAt: Date.now() };
  }

  const { token, owner, repo, branch } = repoInfo();
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${FILE_PATH.split("/")
    .map(encodeURIComponent)
    .join("/")}?ref=${branch}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (res.status === 404) {
      return { data: {}, sha: null, fetchedAt: Date.now() };
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const json = await res.json();
    const sha: string = json.sha;
    const content: string = json.content ?? "";
    const decoded = Buffer.from(content, "base64").toString("utf-8");
    const data = decoded.trim() ? (JSON.parse(decoded) as Record<string, unknown>) : {};

    return { data, sha, fetchedAt: Date.now() };
  } catch (err) {
    console.error("github-store: fetchData failed", err);
    const data: Record<string, unknown> = {};
    for (const [k, v] of memoryStore) data[k] = v;
    return { data, sha: cache?.sha ?? null, fetchedAt: Date.now() };
  }
}

let writeChain: Promise<void> = Promise.resolve();

function serialWrite(fn: () => Promise<void>): Promise<void> {
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

async function persistData(data: Record<string, unknown>, knownSha: string | null): Promise<void> {
  if (!configured()) {
    for (const [k, v] of Object.entries(data)) memoryStore.set(k, v);
    cache = { data: { ...data }, sha: null, fetchedAt: Date.now() };
    return;
  }

  const { token, owner, repo, branch } = repoInfo();
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${FILE_PATH.split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const content = Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString("base64");

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "chore: update store.json [automated]",
      content,
      sha: knownSha ?? undefined,
      branch,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub PUT ${res.status}: ${body}`);
  }

  const json = await res.json();
  cache = { data: { ...data }, sha: json.content?.sha ?? null, fetchedAt: Date.now() };
}

export async function ghGet<T = unknown>(key: string): Promise<T | null> {
  const { data } = await ensureData();
  return (data[key] as T) ?? null;
}

export async function ghSet(key: string, value: unknown): Promise<void> {
  await serialWrite(async () => {
    const entry = await ensureData();
    const next = { ...entry.data, [key]: value };
    await persistData(next, entry.sha);
  });
}

export async function ghDelete(key: string): Promise<void> {
  await serialWrite(async () => {
    const entry = await ensureData();
    if (!(key in entry.data)) return;
    const next = { ...entry.data };
    delete next[key];
    await persistData(next, entry.sha);
  });
}

export async function ghIncr(key: string, by = 1): Promise<number> {
  const entry = await ensureData();
  const current = Number((entry.data[key] as number) ?? 0);
  const next = current + by;
  await serialWrite(async () => {
    const fresh = await ensureData();
    const cur = Number((fresh.data[key] as number) ?? 0);
    const updated = { ...fresh.data, [key]: cur + by };
    await persistData(updated, fresh.sha);
  });
  return next;
}

export async function ghAppend(key: string, item: unknown, maxItems = 100): Promise<unknown[]> {
  const entry = await ensureData();
  const arr = Array.isArray(entry.data[key]) ? (entry.data[key] as unknown[]) : [];
  arr.unshift(item);
  const trimmed = arr.slice(0, maxItems);
  await serialWrite(async () => {
    const fresh = await ensureData();
    const a = Array.isArray(fresh.data[key]) ? (fresh.data[key] as unknown[]) : [];
    a.unshift(item);
    const t = a.slice(0, maxItems);
    await persistData({ ...fresh.data, [key]: t }, fresh.sha);
  });
  return trimmed;
}

export async function ghMutate<T>(
  key: string,
  mutator: (current: T | null) => T,
): Promise<T> {
  const entry = await ensureData();
  const current = (entry.data[key] as T) ?? null;
  const next = mutator(current);
  await serialWrite(async () => {
    const fresh = await ensureData();
    const cur = (fresh.data[key] as T) ?? null;
    const updated = { ...fresh.data, [key]: mutator(cur) };
    await persistData(updated, fresh.sha);
  });
  return next;
}

export async function ghListKeys(prefix: string): Promise<string[]> {
  const { data } = await ensureData();
  return Object.keys(data).filter((k) => k.startsWith(prefix));
}

export async function ghKeys(): Promise<string[]> {
  const { data } = await ensureData();
  return Object.keys(data);
}

export { configured as githubStoreConfigured };
