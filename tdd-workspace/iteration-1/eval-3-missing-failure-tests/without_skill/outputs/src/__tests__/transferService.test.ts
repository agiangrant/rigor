import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferService } from '../services/transferService';
import { db } from '../db';

vi.mock('../db');

describe('TransferService', () => {
  const service = new TransferService();

  const validFrom = { id: 'a1', userId: 'u1', balance: 1000, currency: 'USD', frozen: false };
  const validTo = { id: 'a2', userId: 'u2', balance: 500, currency: 'USD', frozen: false };

  beforeEach(() => vi.clearAllMocks());

  describe('transfer', () => {
    it('successfully transfers between accounts', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom })
        .mockResolvedValueOnce({ ...validTo });
      vi.mocked(db.transfers.create).mockResolvedValue({
        id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 200, currency: 'USD', status: 'completed', createdAt: new Date(),
      });

      const result = await service.transfer('a1', 'a2', 200);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(200);
      expect(db.accounts.update).toHaveBeenCalledWith('a1', { balance: 800 });
      expect(db.accounts.update).toHaveBeenCalledWith('a2', { balance: 700 });
    });

    it('succeeds when transferring exact full balance', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom, balance: 500 })
        .mockResolvedValueOnce({ ...validTo });
      vi.mocked(db.transfers.create).mockResolvedValue({
        id: 't2', fromAccountId: 'a1', toAccountId: 'a2', amount: 500, currency: 'USD', status: 'completed', createdAt: new Date(),
      });

      const result = await service.transfer('a1', 'a2', 500);
      expect(result.status).toBe('completed');
      expect(db.accounts.update).toHaveBeenCalledWith('a1', { balance: 0 });
      expect(db.accounts.update).toHaveBeenCalledWith('a2', { balance: 1000 });
    });

    it('rejects zero amount', async () => {
      await expect(service.transfer('a1', 'a2', 0)).rejects.toThrow('Transfer amount must be positive');
      expect(db.accounts.findById).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects negative amount', async () => {
      await expect(service.transfer('a1', 'a2', -100)).rejects.toThrow('Transfer amount must be positive');
      expect(db.accounts.findById).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects transfer to same account', async () => {
      await expect(service.transfer('a1', 'a1', 100)).rejects.toThrow('Cannot transfer to same account');
      expect(db.accounts.findById).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects when source account not found', async () => {
      vi.mocked(db.accounts.findById).mockResolvedValueOnce(null);

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Source account not found');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects when destination account not found', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom })
        .mockResolvedValueOnce(null);

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Destination account not found');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects when source account is frozen', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom, frozen: true })
        .mockResolvedValueOnce({ ...validTo });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Source account is frozen');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects when destination account is frozen', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom })
        .mockResolvedValueOnce({ ...validTo, frozen: true });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Destination account is frozen');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects when currencies do not match', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom, currency: 'USD' })
        .mockResolvedValueOnce({ ...validTo, currency: 'EUR' });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Currency mismatch: USD vs EUR');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('rejects when balance is insufficient', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ ...validFrom, balance: 50 })
        .mockResolvedValueOnce({ ...validTo });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Insufficient funds');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });
  });
});
