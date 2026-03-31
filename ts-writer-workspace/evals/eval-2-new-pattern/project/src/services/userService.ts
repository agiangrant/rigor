import { db } from '../db';
import type { User } from '../types';

export class UserService {
  async getById(id: string): Promise<User | null> {
    return db.users.findById(id);
  }

  async create(email: string, role: 'admin' | 'member'): Promise<User> {
    return db.users.create({ email, role });
  }
}
