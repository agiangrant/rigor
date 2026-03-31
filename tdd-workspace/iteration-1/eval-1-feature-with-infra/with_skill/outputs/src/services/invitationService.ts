import { randomUUID } from 'crypto';
import { db } from '../db';

export interface Invitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted';
  expiresAt: Date;
}

const EXPIRATION_MS = 24 * 60 * 60 * 1000;

export class InvitationService {
  async create(email: string): Promise<Invitation> {
    if (!email) {
      throw new Error('Email is required');
    }

    const existing = await db.invitations.findByEmail(email);
    const hasActive = existing.some(
      (inv: Invitation) => inv.status === 'pending' && inv.expiresAt.getTime() > Date.now(),
    );
    if (hasActive) {
      throw new Error('Active invitation already exists for this email');
    }

    const invitation = await db.invitations.create({
      email,
      token: randomUUID(),
      status: 'pending',
      expiresAt: new Date(Date.now() + EXPIRATION_MS),
    });

    return invitation as Invitation;
  }

  async accept(token: string): Promise<Invitation> {
    const invitation = await db.invitations.findByToken(token) as Invitation | null;

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status === 'accepted') {
      throw new Error('Invitation has already been accepted');
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new Error('Invitation has expired');
    }

    const updated = await db.invitations.update(invitation.id, { status: 'accepted' });
    return updated as Invitation;
  }
}
