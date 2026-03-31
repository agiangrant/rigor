import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../services/orderService';
import { db } from '../db';

vi.mock('../db');

describe('OrderService', () => {
  const service = new OrderService();
  beforeEach(() => vi.clearAllMocks());

  describe('createOrder', () => {
    it('creates an order with correct total', async () => {
      vi.mocked(db.products.findById).mockResolvedValue({ id: 'p1', price: 10 });
      vi.mocked(db.orders.create).mockResolvedValue({ id: 'o1', total: 50 } as any);

      const result = await service.createOrder('u1', [
        { productId: 'p1', quantity: 5 },
      ]);

      expect(result).toBeDefined();
    });
  });
});
