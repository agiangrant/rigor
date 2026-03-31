// Hand-rolled in-memory cache used across the app.
// It's been causing issues: no TTL support, no invalidation strategy,
// memory grows unbounded, and different modules use it differently.

const store: Map<string, { value: any; timestamp: number }> = new Map();

export function cacheGet(key: string): any | null {
  const entry = store.get(key);
  if (!entry) return null;
  // Stale after 5 minutes (hardcoded)
  if (Date.now() - entry.timestamp > 300000) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key: string, value: any): void {
  store.set(key, { value, timestamp: Date.now() });
}

export function cacheClear(): void {
  store.clear();
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheGetAll(): Map<string, any> {
  return new Map(Array.from(store.entries()).map(([k, v]) => [k, v.value]));
}
