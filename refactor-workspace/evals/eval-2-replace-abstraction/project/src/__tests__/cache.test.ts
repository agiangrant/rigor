import { describe, it, expect, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheClear, cacheDelete, cacheGetAll } from '../cache';

describe('cache', () => {
  beforeEach(() => cacheClear());

  it('stores and retrieves values', () => {
    cacheSet('key', 'value');
    expect(cacheGet('key')).toBe('value');
  });

  it('returns null for missing keys', () => {
    expect(cacheGet('missing')).toBeNull();
  });

  it('deletes keys', () => {
    cacheSet('key', 'value');
    cacheDelete('key');
    expect(cacheGet('key')).toBeNull();
  });

  it('gets all entries', () => {
    cacheSet('a', 1);
    cacheSet('b', 2);
    const all = cacheGetAll();
    expect(all.get('a')).toBe(1);
    expect(all.get('b')).toBe(2);
  });
});
