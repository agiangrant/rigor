export interface CacheOptions {
  /** Time-to-live in milliseconds. Entries expire after this duration. Default: 300_000 (5 min). */
  ttlMs?: number;
  /** Maximum number of entries. When exceeded, the least-recently-used entry is evicted. Default: 1000. */
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 300_000;
    this.maxSize = options.maxSize ?? 1000;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    // Move to end for LRU ordering (Map preserves insertion order)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T): void {
    // If key already exists, delete first so it moves to end
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value!;
      this.store.delete(oldest);
    }

    this.store.set(key, { value, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
