import { db } from '../db';
import type { User, UserPreferences } from '../models/user';

export class UserService {
  async getById(id: string): Promise<User> {
    const user = await db.users.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async updatePreferences(userId: string, prefs: Partial<UserPreferences>): Promise<User> {
    const user = await this.getById(userId);
    const updated = {
      ...user,
      preferences: { ...user.preferences, ...prefs },
    };
    return db.users.update(userId, updated);
  }
}
