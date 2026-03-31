import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferService } from '../services/transferService';
import { db } from '../db';

vi.mock('../db');

describe('TransferService', () => {
  const service = new TransferService();

  beforeEach(() => vi.clearAllMocks());

  describe('transfer', () => {
    it('successfully transfers between accounts', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 1000, currency: 'USD', frozen: false })
        .mockResolvedValueOnce({ id: 'a2', userId: 'u2', balance: 500, currency: 'USD', frozen: false });
      vi.mocked(db.transfers.create).mockResolvedValue({
        id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 200, currency: 'USD', status: 'completed', createdAt: new Date(),
      });

      const result = await service.transfer('a1', 'a2', 200);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(200);
      expect(db.accounts.update).toHaveBeenCalledWith('a1', { balance: 800 });
      expect(db.accounts.update).toHaveBeenCalledWith('a2', { balance: 700 });
    });
  });
});
