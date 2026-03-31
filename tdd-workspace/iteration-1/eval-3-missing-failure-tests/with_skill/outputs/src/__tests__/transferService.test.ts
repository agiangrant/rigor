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

    it('transfers the entire account balance', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 500, currency: 'USD', frozen: false })
        .mockResolvedValueOnce({ id: 'a2', userId: 'u2', balance: 300, currency: 'USD', frozen: false });
      vi.mocked(db.transfers.create).mockResolvedValue({
        id: 't2', fromAccountId: 'a1', toAccountId: 'a2', amount: 500, currency: 'USD', status: 'completed', createdAt: new Date(),
      });

      const result = await service.transfer('a1', 'a2', 500);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(500);
      expect(db.accounts.update).toHaveBeenCalledWith('a1', { balance: 0 });
      expect(db.accounts.update).toHaveBeenCalledWith('a2', { balance: 800 });
    });

    it('throws when amount is zero', async () => {
      await expect(service.transfer('a1', 'a2', 0)).rejects.toThrow('Transfer amount must be positive');
      expect(db.accounts.findById).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when amount is negative', async () => {
      await expect(service.transfer('a1', 'a2', -100)).rejects.toThrow('Transfer amount must be positive');
      expect(db.accounts.findById).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when transferring to the same account', async () => {
      await expect(service.transfer('a1', 'a1', 100)).rejects.toThrow('Cannot transfer to same account');
      expect(db.accounts.findById).not.toHaveBeenCalled();
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when source account does not exist', async () => {
      vi.mocked(db.accounts.findById).mockResolvedValueOnce(null);

      await expect(service.transfer('missing', 'a2', 100)).rejects.toThrow('Source account not found');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when destination account does not exist', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 1000, currency: 'USD', frozen: false })
        .mockResolvedValueOnce(null);

      await expect(service.transfer('a1', 'missing', 100)).rejects.toThrow('Destination account not found');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when source account is frozen', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 1000, currency: 'USD', frozen: true })
        .mockResolvedValueOnce({ id: 'a2', userId: 'u2', balance: 500, currency: 'USD', frozen: false });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Source account is frozen');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when destination account is frozen', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 1000, currency: 'USD', frozen: false })
        .mockResolvedValueOnce({ id: 'a2', userId: 'u2', balance: 500, currency: 'USD', frozen: true });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Destination account is frozen');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when account currencies do not match', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 1000, currency: 'USD', frozen: false })
        .mockResolvedValueOnce({ id: 'a2', userId: 'u2', balance: 500, currency: 'EUR', frozen: false });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Currency mismatch: USD vs EUR');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('throws when source account has insufficient funds', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce({ id: 'a1', userId: 'u1', balance: 50, currency: 'USD', frozen: false })
        .mockResolvedValueOnce({ id: 'a2', userId: 'u2', balance: 500, currency: 'USD', frozen: false });

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Insufficient funds');
      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });
  });
});
