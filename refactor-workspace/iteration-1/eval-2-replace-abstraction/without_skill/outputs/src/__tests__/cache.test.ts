import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from '../cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({ ttlMs: 5000, maxSize: 3 });
  });

  it('stores and retrieves values', () => {
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('returns null for missing keys', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('deletes keys', () => {
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeNull();
  });

  it('clears all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('expires entries after TTL', () => {
    cache.set('key', 'value');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);
    expect(cache.get('key')).toBeNull();
    vi.restoreAllMocks();
  });

  it('does not expire entries before TTL', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    cache.set('key', 'value');
    vi.mocked(Date.now).mockReturnValue(now + 4000);
    expect(cache.get('key')).toBe('value');
    vi.restoreAllMocks();
  });

  it('evicts oldest entry when maxSize is exceeded', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    cache.set('d', '4'); // should evict 'a'
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('d')).toBe('4');
  });

  it('promotes recently accessed entries (LRU)', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    // Access 'a' to promote it
    cache.get('a');
    // Insert 'd' -- should evict 'b' (oldest not recently accessed)
    cache.set('d', '4');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeNull();
  });

  it('reports size correctly', () => {
    expect(cache.size).toBe(0);
    cache.set('a', '1');
    expect(cache.size).toBe(1);
    cache.set('b', '2');
    expect(cache.size).toBe(2);
    cache.delete('a');
    expect(cache.size).toBe(1);
  });

  it('uses configurable TTL', () => {
    const shortCache = new Cache<string>({ ttlMs: 100 });
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    shortCache.set('key', 'value');
    vi.mocked(Date.now).mockReturnValue(now + 101);
    expect(shortCache.get('key')).toBeNull();
    vi.restoreAllMocks();
  });
});
