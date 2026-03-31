import { db } from './db';
import { cacheGet, cacheSet } from './cache';

export class UserService {
  async getUser(id: string) {
    const cached = cacheGet(`user:${id}`);
    if (cached) return cached;
    const user = await db.users.findById(id);
    if (user) cacheSet(`user:${id}`, user);
    return user;
  }

  // Note: UserService never invalidates cache on update — known bug
  async updateUser(id: string, data: any) {
    return db.users.update(id, data);
  }
}
