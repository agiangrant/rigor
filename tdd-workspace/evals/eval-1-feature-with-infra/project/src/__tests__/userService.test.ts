import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/userService';
import { db } from '../db';

vi.mock('../db');

describe('UserService', () => {
  const service = new UserService();

  beforeEach(() => vi.clearAllMocks());

  describe('getById', () => {
    it('returns user when found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice' });
      const user = await service.getById('1');
      expect(user.email).toBe('a@b.com');
    });

    it('throws when user not found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      await expect(service.getById('999')).rejects.toThrow('User not found');
    });
  });

  describe('create', () => {
    it('creates user with valid data', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      vi.mocked(db.users.create).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice' });
      const user = await service.create('a@b.com', 'Alice');
      expect(user.email).toBe('a@b.com');
    });

    it('throws on duplicate email', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1' } as any);
      await expect(service.create('a@b.com', 'Alice')).rejects.toThrow('Email already in use');
    });
  });
});
