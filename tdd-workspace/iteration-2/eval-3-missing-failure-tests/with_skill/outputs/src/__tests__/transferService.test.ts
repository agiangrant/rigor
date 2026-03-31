import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferService, Account } from '../services/transferService';
import { db } from '../db';

vi.mock('../db');

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'a1',
  userId: 'u1',
  balance: 1000,
  currency: 'USD',
  frozen: false,
  ...overrides,
});

describe('TransferService', () => {
  const service = new TransferService();

  beforeEach(() => vi.clearAllMocks());

  describe('transfer', () => {
    // ---- Happy Path ----

    it('successfully transfers between accounts', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 1000 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', balance: 500 }));
      vi.mocked(db.transfers.create).mockResolvedValue({
        id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 200, currency: 'USD', status: 'completed', createdAt: new Date(),
      });

      const result = await service.transfer('a1', 'a2', 200);

      expect(result.status).toBe('completed');
      expect(result.amount).toBe(200);
      expect(db.accounts.update).toHaveBeenCalledWith('a1', { balance: 800 });
      expect(db.accounts.update).toHaveBeenCalledWith('a2', { balance: 700 });
      expect(db.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fromAccountId: 'a1',
          toAccountId: 'a2',
          amount: 200,
          currency: 'USD',
          status: 'completed',
        }),
      );
    });

    it('transfers the entire balance when amount equals balance', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 500 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', balance: 100 }));
      vi.mocked(db.transfers.create).mockResolvedValue({
        id: 't1', fromAccountId: 'a1', toAccountId: 'a2', amount: 500, currency: 'USD', status: 'completed', createdAt: new Date(),
      });

      const result = await service.transfer('a1', 'a2', 500);

      expect(result.status).toBe('completed');
      expect(db.accounts.update).toHaveBeenCalledWith('a1', { balance: 0 });
      expect(db.accounts.update).toHaveBeenCalledWith('a2', { balance: 600 });
    });

    // ---- Input Validation ----

    it('throws when transfer amount is zero', async () => {
      await expect(service.transfer('a1', 'a2', 0)).rejects.toThrow('Transfer amount must be positive');
    });

    it('throws when transfer amount is negative', async () => {
      await expect(service.transfer('a1', 'a2', -100)).rejects.toThrow('Transfer amount must be positive');
    });

    it('throws when source and destination are the same account', async () => {
      await expect(service.transfer('a1', 'a1', 100)).rejects.toThrow('Cannot transfer to same account');
    });

    // ---- Account Lookup ----

    it('throws when source account does not exist', async () => {
      vi.mocked(db.accounts.findById).mockResolvedValueOnce(null);

      await expect(service.transfer('missing', 'a2', 100)).rejects.toThrow('Source account not found');
    });

    it('throws when destination account does not exist', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1' }))
        .mockResolvedValueOnce(null);

      await expect(service.transfer('a1', 'missing', 100)).rejects.toThrow('Destination account not found');
    });

    // ---- Account State ----

    it('throws when source account is frozen', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', frozen: true }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2' }));

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Source account is frozen');
    });

    it('throws when destination account is frozen', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1' }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', frozen: true }));

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Destination account is frozen');
    });

    // ---- Business Rules ----

    it('throws on currency mismatch between accounts', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', currency: 'USD' }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', currency: 'EUR' }));

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Currency mismatch: USD vs EUR');
    });

    it('throws when source account has insufficient funds', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 50 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2' }));

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Insufficient funds');
    });

    // ---- Guard Verification: no writes on validation failure ----

    it('does not write to the database when validation fails', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 50 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2' }));

      await expect(service.transfer('a1', 'a2', 100)).rejects.toThrow('Insufficient funds');

      expect(db.accounts.update).not.toHaveBeenCalled();
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    // ---- Database Error Propagation ----

    it('propagates error when source account debit fails', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 1000 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', balance: 500 }));
      vi.mocked(db.accounts.update).mockRejectedValueOnce(new Error('DB write failed'));

      await expect(service.transfer('a1', 'a2', 200)).rejects.toThrow('DB write failed');
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('propagates error when destination account credit fails, leaving inconsistent state', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 1000 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', balance: 500 }));
      vi.mocked(db.accounts.update)
        .mockResolvedValueOnce({ id: 'a1', balance: 800 }) // debit succeeds
        .mockRejectedValueOnce(new Error('DB write failed')); // credit fails

      await expect(service.transfer('a1', 'a2', 200)).rejects.toThrow('DB write failed');

      // Debit was applied but credit was not — inconsistent state.
      // This test documents the gap: there is no transaction rollback.
      expect(db.accounts.update).toHaveBeenCalledTimes(2);
      expect(db.transfers.create).not.toHaveBeenCalled();
    });

    it('propagates error when transfer record creation fails after balances are updated', async () => {
      vi.mocked(db.accounts.findById)
        .mockResolvedValueOnce(makeAccount({ id: 'a1', balance: 1000 }))
        .mockResolvedValueOnce(makeAccount({ id: 'a2', userId: 'u2', balance: 500 }));
      vi.mocked(db.accounts.update).mockResolvedValue({ id: 'a1', balance: 800 });
      vi.mocked(db.transfers.create).mockRejectedValueOnce(new Error('DB write failed'));

      await expect(service.transfer('a1', 'a2', 200)).rejects.toThrow('DB write failed');

      // Both balance updates succeeded but there is no transfer record.
      // This documents another gap in atomicity.
      expect(db.accounts.update).toHaveBeenCalledTimes(2);
    });
  });
});
