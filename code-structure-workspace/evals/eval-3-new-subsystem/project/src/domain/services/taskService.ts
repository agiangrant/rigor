import { Task } from '../models/task';
import { taskRepo } from '../../infrastructure/database/taskRepo';

export class TaskService {
  static async list(userId: string): Promise<Task[]> { return taskRepo.findByUser(userId); }
  static async create(userId: string, data: Partial<Task>) { return taskRepo.create({ ...data, status: 'todo' }); }
  static async update(id: string, data: Partial<Task>) { return taskRepo.update(id, data); }
}
