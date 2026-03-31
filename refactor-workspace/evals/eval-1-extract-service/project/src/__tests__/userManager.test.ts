import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManager } from '../userManager';
import { db } from '../db';
import { sendEmail } from '../email';

vi.mock('../db');
vi.mock('../email');

describe('UserManager', () => {
  const manager = new UserManager();

  beforeEach(() => { vi.clearAllMocks(); });

  describe('createUser', () => {
    it('creates a user and sends welcome email', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      vi.mocked(db.users.create).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', password: 'hashed' });
      const user = await manager.createUser('a@b.com', 'pass', 'Alice');
      expect(user.email).toBe('a@b.com');
      expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'Welcome!', expect.any(String));
    });

    it('throws if email already exists', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1' } as any);
      await expect(manager.createUser('a@b.com', 'pass', 'Alice')).rejects.toThrow('Email already in use');
    });
  });

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', password: 'hashed' });
      const result = await manager.login('a@b.com', 'pass');
      expect(result.token).toBeDefined();
      expect(db.sessions.create).toHaveBeenCalled();
    });

    it('throws on invalid email', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      await expect(manager.login('x@y.com', 'pass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('changePassword', () => {
    it('updates password when current password is valid', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', password: 'hashed' } as any);
      await manager.changePassword('1', 'old', 'new');
      expect(db.users.update).toHaveBeenCalledWith('1', { password: 'hashed' });
    });
  });

  describe('requestPasswordReset', () => {
    it('sends reset email when user exists', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1', email: 'a@b.com' } as any);
      await manager.requestPasswordReset('a@b.com');
      expect(sendEmail).toHaveBeenCalled();
      expect(db.passwordResets.create).toHaveBeenCalled();
    });

    it('does nothing when user does not exist', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      await manager.requestPasswordReset('x@y.com');
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });
});
