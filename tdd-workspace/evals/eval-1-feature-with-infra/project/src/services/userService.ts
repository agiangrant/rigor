import { db } from '../db';

export class UserService {
  async getById(id: string) {
    const user = await db.users.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async create(email: string, name: string) {
    const existing = await db.users.findByEmail(email);
    if (existing) throw new Error('Email already in use');
    return db.users.create({ email, name });
  }
}
