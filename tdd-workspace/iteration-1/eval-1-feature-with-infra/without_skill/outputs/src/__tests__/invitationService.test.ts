import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationService } from '../services/invitationService';
import { db } from '../db';

vi.mock('../db');

describe('InvitationService', () => {
  const service = new InvitationService();

  beforeEach(() => vi.clearAllMocks());

  describe('invite', () => {
    it('creates an invitation with token and 24h expiration', async () => {
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([]);
      vi.mocked(db.invitations.create).mockImplementation(async (data: any) => ({
        id: '1',
        ...data,
      }));

      const invitation = await service.invite('user@example.com');

      expect(invitation.email).toBe('user@example.com');
      expect(invitation.token).toBeDefined();
      expect(invitation.token.length).toBe(64); // 32 bytes hex
      expect(invitation.status).toBe('pending');
      expect(invitation.expiresAt).toBeInstanceOf(Date);

      const diffMs = invitation.expiresAt.getTime() - invitation.createdAt.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    });

    it('throws on invalid email', async () => {
      await expect(service.invite('')).rejects.toThrow('Invalid email address');
      await expect(service.invite('not-an-email')).rejects.toThrow('Invalid email address');
    });

    it('throws when active invitation already exists for email', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([
        { id: '1', email: 'user@example.com', token: 'abc', status: 'pending', expiresAt: futureDate },
      ]);

      await expect(service.invite('user@example.com')).rejects.toThrow(
        'Active invitation already exists for this email'
      );
    });

    it('allows new invitation when previous one has expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([
        { id: '1', email: 'user@example.com', token: 'abc', status: 'pending', expiresAt: pastDate },
      ]);
      vi.mocked(db.invitations.create).mockImplementation(async (data: any) => ({
        id: '2',
        ...data,
      }));

      const invitation = await service.invite('user@example.com');
      expect(invitation.status).toBe('pending');
    });

    it('allows new invitation when previous one was accepted', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([
        { id: '1', email: 'user@example.com', token: 'abc', status: 'accepted', expiresAt: futureDate },
      ]);
      vi.mocked(db.invitations.create).mockImplementation(async (data: any) => ({
        id: '2',
        ...data,
      }));

      const invitation = await service.invite('user@example.com');
      expect(invitation.status).toBe('pending');
    });
  });

  describe('accept', () => {
    it('accepts a valid pending invitation', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      vi.mocked(db.invitations.findByToken).mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        token: 'valid-token',
        status: 'pending',
        expiresAt: futureDate,
      });
      vi.mocked(db.invitations.update).mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        token: 'valid-token',
        status: 'accepted',
        expiresAt: futureDate,
      });

      const result = await service.accept('valid-token');
      expect(result.status).toBe('accepted');
      expect(db.invitations.update).toHaveBeenCalledWith('1', { status: 'accepted' });
    });

    it('throws when token not found', async () => {
      vi.mocked(db.invitations.findByToken).mockResolvedValue(null);
      await expect(service.accept('bad-token')).rejects.toThrow('Invitation not found');
    });

    it('throws when invitation already accepted', async () => {
      vi.mocked(db.invitations.findByToken).mockResolvedValue({
        id: '1',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await expect(service.accept('used-token')).rejects.toThrow('Invitation already accepted');
    });

    it('throws when invitation has expired by status', async () => {
      vi.mocked(db.invitations.findByToken).mockResolvedValue({
        id: '1',
        status: 'expired',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });

      await expect(service.accept('expired-token')).rejects.toThrow('Invitation has expired');
    });

    it('throws and marks expired when invitation is past expiration time', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      vi.mocked(db.invitations.findByToken).mockResolvedValue({
        id: '1',
        status: 'pending',
        expiresAt: pastDate,
      });
      vi.mocked(db.invitations.update).mockResolvedValue({ id: '1', status: 'expired' });

      await expect(service.accept('stale-token')).rejects.toThrow('Invitation has expired');
      expect(db.invitations.update).toHaveBeenCalledWith('1', { status: 'expired' });
    });
  });
});
