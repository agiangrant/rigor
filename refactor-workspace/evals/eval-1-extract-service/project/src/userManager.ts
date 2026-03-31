import { db } from './db';
import { sendEmail } from './email';
import { hashPassword, verifyPassword, generateToken } from './crypto';

export class UserManager {
  // ---- User CRUD ----
  async createUser(email: string, password: string, name: string) {
    const existing = await db.users.findByEmail(email);
    if (existing) throw new Error('Email already in use');
    const hashed = await hashPassword(password);
    const user = await db.users.create({ email, password: hashed, name });
    await sendEmail(email, 'Welcome!', `Hi ${name}, welcome aboard.`);
    return user;
  }

  async getUserById(id: string) {
    return db.users.findById(id);
  }

  async updateUser(id: string, data: { name?: string; email?: string }) {
    return db.users.update(id, data);
  }

  async deleteUser(id: string) {
    const user = await db.users.findById(id);
    if (!user) throw new Error('User not found');
    await db.users.delete(id);
    await sendEmail(user.email, 'Account Deleted', 'Your account has been deleted.');
  }

  // ---- Authentication ----
  async login(email: string, password: string) {
    const user = await db.users.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    const valid = await verifyPassword(password, user.password);
    if (!valid) throw new Error('Invalid credentials');
    const token = generateToken(user.id);
    await db.sessions.create({ userId: user.id, token, createdAt: new Date() });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async logout(token: string) {
    await db.sessions.deleteByToken(token);
  }

  async validateSession(token: string) {
    const session = await db.sessions.findByToken(token);
    if (!session) return null;
    return db.users.findById(session.userId);
  }

  // ---- Password Management ----
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await db.users.findById(userId);
    if (!user) throw new Error('User not found');
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw new Error('Current password is incorrect');
    const hashed = await hashPassword(newPassword);
    await db.users.update(userId, { password: hashed });
  }

  async requestPasswordReset(email: string) {
    const user = await db.users.findByEmail(email);
    if (!user) return; // Don't reveal if email exists
    const resetToken = generateToken(user.id);
    await db.passwordResets.create({ userId: user.id, token: resetToken, expiresAt: new Date(Date.now() + 3600000) });
    await sendEmail(email, 'Password Reset', `Your reset token: ${resetToken}`);
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const reset = await db.passwordResets.findByToken(resetToken);
    if (!reset || reset.expiresAt < new Date()) throw new Error('Invalid or expired reset token');
    const hashed = await hashPassword(newPassword);
    await db.users.update(reset.userId, { password: hashed });
    await db.passwordResets.delete(reset.id);
  }
}
