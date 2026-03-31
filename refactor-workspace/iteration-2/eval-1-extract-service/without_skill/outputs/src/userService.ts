import { db } from './db';
import { sendEmail } from './email';
import { hashPassword } from './crypto';

export class UserService {
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
}
