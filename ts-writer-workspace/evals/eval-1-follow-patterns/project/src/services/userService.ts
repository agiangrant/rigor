import { db } from '../db';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface CreateUserInput {
  email: string;
  name: string;
}

export class UserService {
  async getById(id: string): Promise<User> {
    const user = await db.users.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    if (!input.email.includes('@')) throw new ValidationError('Invalid email format');
    if (!input.name.trim()) throw new ValidationError('Name cannot be empty');

    const existing = await db.users.findByEmail(input.email);
    if (existing) throw new ConflictError(`Email already in use: ${input.email}`);

    return db.users.create({
      email: input.email.toLowerCase(),
      name: input.name.trim(),
      createdAt: new Date(),
    });
  }

  async list(): Promise<User[]> {
    return db.users.findAll();
  }
}
