import { User } from '../models/user';
export class UserService {
  static async list() { return []; }
  static async findById(id: string) { return null; }
  static async create(data: Partial<User>) { return data; }
}
