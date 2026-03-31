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
  updatedAt: Date;
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
    if (!input.description.trim()) throw new ValidationError('Description cannot be empty');

    const owner = await db.users.findById(input.ownerId);
    if (!owner) throw new NotFoundError('User', input.ownerId);

    const now = new Date();
    return db.projects.create({
      name: input.name.trim(),
      description: input.description.trim(),
      ownerId: input.ownerId,
      status: 'active' as ProjectStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getById(id: string): Promise<Project> {
    const project = await db.projects.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  }

  async listByOwner(ownerId: string): Promise<Project[]> {
    return db.projects.findByUserId(ownerId);
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const project = await db.projects.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    if (project.status === 'archived') throw new ValidationError('Cannot update an archived project');

    if (input.name !== undefined && !input.name.trim()) throw new ValidationError('Name cannot be empty');
    if (input.description !== undefined && !input.description.trim()) throw new ValidationError('Description cannot be empty');

    return db.projects.update(id, {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      updatedAt: new Date(),
    });
  }

  async archive(id: string): Promise<Project> {
    const project = await db.projects.findById(id);
    if (!project) throw new NotFoundError('Project', id);
    if (project.status === 'archived') throw new ValidationError('Project is already archived');

    return db.projects.update(id, {
      status: 'archived' as ProjectStatus,
      updatedAt: new Date(),
    });
  }
}
