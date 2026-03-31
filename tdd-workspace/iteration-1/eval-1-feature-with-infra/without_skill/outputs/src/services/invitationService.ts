import { db } from '../db';
import { randomBytes } from 'crypto';

const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Invitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export class InvitationService {
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private now(): Date {
    return new Date();
  }

  async invite(email: string): Promise<Invitation> {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const existing = await db.invitations.findByEmail(email);
    const pending = existing.find(
      (inv: Invitation) => inv.status === 'pending' && new Date(inv.expiresAt) > this.now()
    );
    if (pending) {
      throw new Error('Active invitation already exists for this email');
    }

    const token = this.generateToken();
    const now = this.now();
    const expiresAt = new Date(now.getTime() + EXPIRATION_MS);

    const invitation = await db.invitations.create({
      email,
      token,
      status: 'pending',
      expiresAt,
      createdAt: now,
    });

    return invitation as Invitation;
  }

  async accept(token: string): Promise<Invitation> {
    const invitation = await db.invitations.findByToken(token);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status === 'accepted') {
      throw new Error('Invitation already accepted');
    }

    if (invitation.status === 'expired' || new Date(invitation.expiresAt) <= this.now()) {
      if (invitation.status !== 'expired') {
        await db.invitations.update(invitation.id, { status: 'expired' });
      }
      throw new Error('Invitation has expired');
    }

    const updated = await db.invitations.update(invitation.id, { status: 'accepted' });
    return updated as Invitation;
  }
}
