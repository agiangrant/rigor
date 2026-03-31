import { Project } from '../models/project';
import { projectRepo } from '../../infrastructure/database/projectRepo';

export class ProjectService {
  static async list(userId: string): Promise<Project[]> { return projectRepo.findByUser(userId); }
  static async create(userId: string, data: Partial<Project>) {
    return projectRepo.create({ ...data, ownerId: userId, memberIds: [userId] });
  }
}
