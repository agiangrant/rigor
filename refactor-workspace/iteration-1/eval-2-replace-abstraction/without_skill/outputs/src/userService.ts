import { db } from './db';
import { Cache } from './cache';

interface User {
  id: string;
  [key: string]: any;
}

const cache = new Cache<User>({ ttlMs: 600_000, maxSize: 1000 });

export class UserService {
  async getUser(id: string) {
    const cached = cache.get(id);
    if (cached) return cached;
    const user = await db.users.findById(id);
    if (user) cache.set(id, user);
    return user;
  }

  async updateUser(id: string, data: any) {
    const user = await db.users.update(id, data);
    cache.delete(id);
    return user;
  }
}
