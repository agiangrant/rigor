import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../userService';
import { db } from '../db';
import { sendEmail } from '../email';

vi.mock('../db');
vi.mock('../email');

describe('UserService', () => {
  const service = new UserService();

  beforeEach(() => { vi.clearAllMocks(); });

  describe('createUser', () => {
    it('creates a user and sends welcome email', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      vi.mocked(db.users.create).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', password: 'hashed' });
      const user = await service.createUser('a@b.com', 'pass', 'Alice');
      expect(user.email).toBe('a@b.com');
      expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'Welcome!', expect.any(String));
    });

    it('throws if email already exists', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1' } as any);
      await expect(service.createUser('a@b.com', 'pass', 'Alice')).rejects.toThrow('Email already in use');
    });
  });

  describe('getUserById', () => {
    it('returns user from db', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice' } as any);
      const user = await service.getUserById('1');
      expect(user.email).toBe('a@b.com');
    });
  });

  describe('updateUser', () => {
    it('updates user data', async () => {
      vi.mocked(db.users.update).mockResolvedValue({ id: '1', name: 'Bob' } as any);
      const user = await service.updateUser('1', { name: 'Bob' });
      expect(db.users.update).toHaveBeenCalledWith('1', { name: 'Bob' });
    });
  });

  describe('deleteUser', () => {
    it('deletes user and sends email', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', email: 'a@b.com' } as any);
      await service.deleteUser('1');
      expect(db.users.delete).toHaveBeenCalledWith('1');
      expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'Account Deleted', 'Your account has been deleted.');
    });

    it('throws if user not found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      await expect(service.deleteUser('1')).rejects.toThrow('User not found');
    });
  });
});
