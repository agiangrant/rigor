import { db } from '../db';
import type { CreateUserInput } from '../schemas/userSchema';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

export class UserService {
  async getById(id: string): Promise<User | null> {
    return db.users.findById(id);
  }

  async create(input: CreateUserInput): Promise<User> {
    return db.users.create({ ...input, createdAt: new Date() });
  }

  async list(): Promise<User[]> {
    return db.users.findAll();
  }
}
