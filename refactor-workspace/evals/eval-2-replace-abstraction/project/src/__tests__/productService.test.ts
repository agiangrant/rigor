import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../productService';
import { cacheGet, cacheSet, cacheDelete } from '../cache';
import { db } from '../db';

vi.mock('../db');
vi.mock('../cache');

describe('ProductService', () => {
  const service = new ProductService();

  beforeEach(() => vi.clearAllMocks());

  it('returns cached product if available', async () => {
    vi.mocked(cacheGet).mockReturnValue({ id: '1', name: 'Widget' });
    const result = await service.getProduct('1');
    expect(result.name).toBe('Widget');
    expect(db.products.findById).not.toHaveBeenCalled();
  });

  it('fetches from db and caches on miss', async () => {
    vi.mocked(cacheGet).mockReturnValue(null);
    vi.mocked(db.products.findById).mockResolvedValue({ id: '1', name: 'Widget' });
    const result = await service.getProduct('1');
    expect(result.name).toBe('Widget');
    expect(cacheSet).toHaveBeenCalledWith('product:1', { id: '1', name: 'Widget' });
  });

  it('invalidates cache on update', async () => {
    vi.mocked(db.products.update).mockResolvedValue({ id: '1', name: 'Updated' });
    await service.updateProduct('1', { name: 'Updated' });
    expect(cacheDelete).toHaveBeenCalledWith('product:1');
    expect(cacheDelete).toHaveBeenCalledWith('products:all');
  });
});
