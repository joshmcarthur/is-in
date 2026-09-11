/** Portable key-value store (Cloudflare KV, in-memory tests, future hosts). */
export type KvPutOptions = {
  /** Hint for hosts that support automatic expiry (e.g. Cloudflare KV). */
  ttlSec?: number;
  /** Cloudflare KV option name; equivalent to {@link KvPutOptions.ttlSec}. */
  expirationTtl?: number;
};

export type KvStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: KvPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
};

/** Minimal Cloudflare KV binding shape used by {@link wrapCloudflareKv}. */
export type CloudflareKvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
};

function ttlSeconds(options?: KvPutOptions): number | undefined {
  return options?.ttlSec ?? options?.expirationTtl;
}

/** Adapt Cloudflare KV binding to {@link KvStore}. */
export function wrapCloudflareKv(kv: CloudflareKvBinding): KvStore {
  return {
    get: (key) => kv.get(key),
    put: (key, value, options) => {
      const ttl = ttlSeconds(options);
      return kv.put(key, value, ttl ? { expirationTtl: ttl } : undefined);
    },
    delete: (key) => kv.delete(key),
  };
}

type MemoryEntry = {
  value: string;
  expiresAt?: number;
};

/** In-memory {@link KvStore} for tests; honours {@link KvPutOptions.ttlSec}. */
export function createMemoryKv(): KvStore {
  const store = new Map<string, MemoryEntry>();

  function purgeExpired(key: string): void {
    const entry = store.get(key);
    if (!entry?.expiresAt) return;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
    }
  }

  return {
    get: async (key) => {
      purgeExpired(key);
      return store.get(key)?.value ?? null;
    },
    put: async (key, value, options) => {
      const ttl = ttlSeconds(options);
      const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
      store.set(key, { value, expiresAt });
    },
    delete: async (key) => {
      store.delete(key);
    },
  };
}
