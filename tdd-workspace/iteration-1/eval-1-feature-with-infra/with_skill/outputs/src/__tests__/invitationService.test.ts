import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvitationService } from '../services/invitationService';
import { db } from '../db';

vi.mock('../db');

describe('InvitationService', () => {
  const service = new InvitationService();

  beforeEach(() => vi.clearAllMocks());

  describe('create', () => {
    it('creates an invitation with token, pending status, and 24h expiration', async () => {
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([]);
      vi.mocked(db.invitations.create).mockImplementation(async (data) => ({
        id: '1',
        ...data,
      }));

      const invitation = await service.create('invitee@example.com');

      expect(invitation.email).toBe('invitee@example.com');
      expect(invitation.status).toBe('pending');
      expect(invitation.token).toBeDefined();
      expect(typeof invitation.token).toBe('string');
      expect(invitation.token.length).toBeGreaterThan(0);
      expect(invitation.expiresAt).toBeInstanceOf(Date);
    });

    it('sets expiration to 24 hours from now', async () => {
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([]);
      vi.mocked(db.invitations.create).mockImplementation(async (data) => ({
        id: '1',
        ...data,
      }));

      const before = Date.now();
      const invitation = await service.create('invitee@example.com');
      const after = Date.now();

      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      const expiresAtMs = invitation.expiresAt.getTime();

      expect(expiresAtMs).toBeGreaterThanOrEqual(before + twentyFourHoursMs);
      expect(expiresAtMs).toBeLessThanOrEqual(after + twentyFourHoursMs);
    });

    it('generates unique tokens for different invitations', async () => {
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([]);
      vi.mocked(db.invitations.create).mockImplementation(async (data) => ({
        id: '1',
        ...data,
      }));

      const inv1 = await service.create('a@example.com');
      const inv2 = await service.create('b@example.com');

      expect(inv1.token).not.toBe(inv2.token);
    });

    it('persists the invitation via db.invitations.create', async () => {
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([]);
      vi.mocked(db.invitations.create).mockImplementation(async (data) => ({
        id: '1',
        ...data,
      }));

      await service.create('invitee@example.com');

      expect(db.invitations.create).toHaveBeenCalledOnce();
      expect(db.invitations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'invitee@example.com',
          status: 'pending',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('throws when email is empty', async () => {
      await expect(service.create('')).rejects.toThrow('Email is required');
    });

    it('throws when a pending non-expired invitation already exists for the email', async () => {
      const existingInvitation = {
        id: '1',
        email: 'invitee@example.com',
        token: 'existing-token',
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now, not expired
      };
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([existingInvitation]);

      await expect(service.create('invitee@example.com')).rejects.toThrow(
        'Active invitation already exists for this email',
      );
    });

    it('allows creating invitation when existing invitation for email is expired', async () => {
      const expiredInvitation = {
        id: '1',
        email: 'invitee@example.com',
        token: 'old-token',
        status: 'pending' as const,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago, expired
      };
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([expiredInvitation]);
      vi.mocked(db.invitations.create).mockImplementation(async (data) => ({
        id: '2',
        ...data,
      }));

      const invitation = await service.create('invitee@example.com');
      expect(invitation.email).toBe('invitee@example.com');
      expect(invitation.status).toBe('pending');
    });

    it('allows creating invitation when existing invitation for email is already accepted', async () => {
      const acceptedInvitation = {
        id: '1',
        email: 'invitee@example.com',
        token: 'old-token',
        status: 'accepted' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // not expired, but accepted
      };
      vi.mocked(db.invitations.findByEmail).mockResolvedValue([acceptedInvitation]);
      vi.mocked(db.invitations.create).mockImplementation(async (data) => ({
        id: '2',
        ...data,
      }));

      const invitation = await service.create('invitee@example.com');
      expect(invitation.email).toBe('invitee@example.com');
    });
  });

  describe('accept', () => {
    it('accepts a pending non-expired invitation by token', async () => {
      const pending = {
        id: '1',
        email: 'invitee@example.com',
        token: 'valid-token',
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
      vi.mocked(db.invitations.findByToken).mockResolvedValue(pending);
      vi.mocked(db.invitations.update).mockImplementation(async (id, data) => ({
        ...pending,
        ...data,
        id,
      }));

      const result = await service.accept('valid-token');

      expect(result.status).toBe('accepted');
      expect(db.invitations.update).toHaveBeenCalledWith('1', { status: 'accepted' });
    });

    it('throws when token does not match any invitation', async () => {
      vi.mocked(db.invitations.findByToken).mockResolvedValue(null);

      await expect(service.accept('nonexistent-token')).rejects.toThrow(
        'Invitation not found',
      );
    });

    it('throws when invitation is expired', async () => {
      const expired = {
        id: '1',
        email: 'invitee@example.com',
        token: 'expired-token',
        status: 'pending' as const,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      vi.mocked(db.invitations.findByToken).mockResolvedValue(expired);

      await expect(service.accept('expired-token')).rejects.toThrow(
        'Invitation has expired',
      );
    });

    it('throws when invitation is already accepted', async () => {
      const alreadyAccepted = {
        id: '1',
        email: 'invitee@example.com',
        token: 'used-token',
        status: 'accepted' as const,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
      vi.mocked(db.invitations.findByToken).mockResolvedValue(alreadyAccepted);

      await expect(service.accept('used-token')).rejects.toThrow(
        'Invitation has already been accepted',
      );
    });
  });
});
