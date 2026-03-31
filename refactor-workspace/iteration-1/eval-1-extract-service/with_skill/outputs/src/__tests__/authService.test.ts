import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../authService';
import { db } from '../db';
import { sendEmail } from '../email';

vi.mock('../db');
vi.mock('../email');

describe('AuthService', () => {
  const service = new AuthService();

  beforeEach(() => { vi.clearAllMocks(); });

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', password: 'hashed' });
      const result = await service.login('a@b.com', 'pass');
      expect(result.token).toBeDefined();
      expect(db.sessions.create).toHaveBeenCalled();
    });

    it('throws on invalid email', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      await expect(service.login('x@y.com', 'pass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('deletes session by token', async () => {
      await service.logout('token-123');
      expect(db.sessions.deleteByToken).toHaveBeenCalledWith('token-123');
    });
  });

  describe('validateSession', () => {
    it('returns user for valid session', async () => {
      vi.mocked(db.sessions.findByToken).mockResolvedValue({ userId: '1', token: 'tok' } as any);
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', email: 'a@b.com' } as any);
      const user = await service.validateSession('tok');
      expect(user?.email).toBe('a@b.com');
    });

    it('returns null for invalid session', async () => {
      vi.mocked(db.sessions.findByToken).mockResolvedValue(null);
      const user = await service.validateSession('bad-token');
      expect(user).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('updates password when current password is valid', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', password: 'hashed' } as any);
      await service.changePassword('1', 'old', 'new');
      expect(db.users.update).toHaveBeenCalledWith('1', { password: 'hashed' });
    });

    it('throws if user not found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      await expect(service.changePassword('1', 'old', 'new')).rejects.toThrow('User not found');
    });

    it('throws if current password is incorrect', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', password: 'hashed' } as any);
      const { verifyPassword } = await import('../crypto');
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);
      await expect(service.changePassword('1', 'wrong', 'new')).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('requestPasswordReset', () => {
    it('sends reset email when user exists', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1', email: 'a@b.com' } as any);
      await service.requestPasswordReset('a@b.com');
      expect(sendEmail).toHaveBeenCalled();
      expect(db.passwordResets.create).toHaveBeenCalled();
    });

    it('does nothing when user does not exist', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      await service.requestPasswordReset('x@y.com');
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('resets password with valid token', async () => {
      vi.mocked(db.passwordResets.findByToken).mockResolvedValue({
        id: 'r1', userId: '1', token: 'tok', expiresAt: new Date(Date.now() + 3600000),
      } as any);
      await service.resetPassword('tok', 'newpass');
      expect(db.users.update).toHaveBeenCalledWith('1', { password: 'hashed' });
      expect(db.passwordResets.delete).toHaveBeenCalledWith('r1');
    });

    it('throws on expired token', async () => {
      vi.mocked(db.passwordResets.findByToken).mockResolvedValue({
        id: 'r1', userId: '1', token: 'tok', expiresAt: new Date(Date.now() - 1000),
      } as any);
      await expect(service.resetPassword('tok', 'newpass')).rejects.toThrow('Invalid or expired reset token');
    });
  });
});
