import { db } from '../db';
import type { User } from '../types';
import { validateEmail, validateNonEmpty, validateRole } from '../validation';

export class UserService {
  async getById(id: string): Promise<User | null> {
    return db.users.findById(id);
  }

  async create(name: string, email: string, role: string): Promise<User> {
    const errors = [
      validateNonEmpty('name', name),
      validateEmail(email),
      validateRole(role),
    ].filter((e): e is NonNullable<typeof e> => e !== null);

    if (errors.length > 0) {
      throw errors[0];
    }

    return db.users.create({ name, email, role });
  }
}
