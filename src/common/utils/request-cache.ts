type CacheEntry<T> = {
  value?: T;
  expiresAt: number;
  staleUntil: number;
  inFlight?: Promise<T>;
};

type CacheOptions = {
  staleTtlMs?: number;
  onError?: (error: unknown) => void;
};

export class RequestCache {
  private static readonly store = new Map<string, CacheEntry<unknown>>();

  static async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const now = Date.now();
    const existing = this.store.get(key) as CacheEntry<T> | undefined;

    if (existing?.value !== undefined && existing.expiresAt > now) {
      return existing.value;
    }

    if (existing?.inFlight) {
      return existing.inFlight;
    }

    const staleTtlMs = options.staleTtlMs ?? ttlMs;
    const promise = loader()
      .then((value) => {
        this.store.set(key, {
          value,
          expiresAt: Date.now() + ttlMs,
          staleUntil: Date.now() + ttlMs + staleTtlMs,
        });
        return value;
      })
      .catch((error) => {
        options.onError?.(error);

        const fallback = this.store.get(key) as CacheEntry<T> | undefined;
        if (
          fallback?.value !== undefined &&
          fallback.staleUntil > Date.now()
        ) {
          return fallback.value;
        }

        this.store.delete(key);
        throw error;
      })
      .finally(() => {
        const current = this.store.get(key) as CacheEntry<T> | undefined;
        if (current?.inFlight) {
          this.store.set(key, {
            value: current.value,
            expiresAt: current.expiresAt,
            staleUntil: current.staleUntil,
          });
        }
      });

    this.store.set(key, {
      value: existing?.value,
      expiresAt: existing?.expiresAt ?? 0,
      staleUntil: existing?.staleUntil ?? 0,
      inFlight: promise,
    });

    return promise;
  }
}
