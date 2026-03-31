import { db } from '../db';
import { NotFoundError, ValidationError } from '../errors';

type ProjectStatus = 'active' | 'archived';

interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  createdAt: Date;
}

interface CreateProjectInput {
  name: string;
  description: string;
  ownerId: string;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export class ProjectService {
  async create(input: CreateProjectInput): Promise<Project> {
    if (!input.name.trim()) throw new ValidationError('Name cannot be empty');
    if (!input.ownerId) throw new ValidationError('Owner ID is required');

    return db.projects.create({
      name: input.name.trim(),
      description: input.description,
      ownerId: input.ownerId,
      status: 'active' as ProjectStatus,
      createdAt: new Date(),
    });
  }

  async getById(id: string): Promise<Project> {
    const project = await db.projects.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  async listByOwner(userId: string): Promise<Project[]> {
    return db.projects.findByUserId(userId);
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await db.projects.findById(id);
    if (!existing) throw new NotFoundError('Project', id);

    if (input.name !== undefined && !input.name.trim()) {
      throw new ValidationError('Name cannot be empty');
    }

    const updates: Record<string, string> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined) updates.description = input.description;

    return db.projects.update(id, updates);
  }

  async archive(id: string): Promise<Project> {
    const existing = await db.projects.findById(id);
    if (!existing) throw new NotFoundError('Project', id);

    return db.projects.update(id, { status: 'archived' });
  }
}
