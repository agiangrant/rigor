import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../productService';
import { Cache } from '../cache';
import { db } from '../db';

vi.mock('../db');
vi.mock('../cache', () => {
  const mockCache = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };
  return {
    Cache: vi.fn(() => mockCache),
    __mockCache: mockCache,
  };
});

// Get the shared mock cache instance (both product and list caches use the same mock)
const { __mockCache: mockCache } = await import('../cache') as any;

describe('ProductService', () => {
  const service = new ProductService();

  beforeEach(() => vi.clearAllMocks());

  it('returns cached product if available', async () => {
    mockCache.get.mockReturnValue({ id: '1', name: 'Widget' });
    const result = await service.getProduct('1');
    expect(result.name).toBe('Widget');
    expect(db.products.findById).not.toHaveBeenCalled();
  });

  it('fetches from db and caches on miss', async () => {
    mockCache.get.mockReturnValue(null);
    vi.mocked(db.products.findById).mockResolvedValue({ id: '1', name: 'Widget' });
    const result = await service.getProduct('1');
    expect(result.name).toBe('Widget');
    expect(mockCache.set).toHaveBeenCalledWith('1', { id: '1', name: 'Widget' });
  });

  it('invalidates cache on update', async () => {
    vi.mocked(db.products.update).mockResolvedValue({ id: '1', name: 'Updated' });
    await service.updateProduct('1', { name: 'Updated' });
    expect(mockCache.delete).toHaveBeenCalledWith('1');
    expect(mockCache.clear).toHaveBeenCalled();
  });
});
