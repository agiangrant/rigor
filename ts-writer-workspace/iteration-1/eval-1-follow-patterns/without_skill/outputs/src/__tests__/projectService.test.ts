import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from '../services/projectService';
import { db } from '../db';
import { NotFoundError, ValidationError } from '../errors';

vi.mock('../db');

describe('ProjectService', () => {
  const service = new ProjectService();
  beforeEach(() => vi.clearAllMocks());

  const activeProject = {
    id: '1',
    name: 'My Project',
    description: 'A test project',
    ownerId: 'user-1',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const archivedProject = { ...activeProject, status: 'archived' };

  describe('create', () => {
    it('creates project with valid input', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: 'user-1', email: 'a@b.com', name: 'Alice', createdAt: new Date() });
      vi.mocked(db.projects.create).mockResolvedValue(activeProject);

      const project = await service.create({ name: '  My Project  ', description: '  A test project  ', ownerId: 'user-1' });

      expect(db.projects.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Project',
        description: 'A test project',
        ownerId: 'user-1',
        status: 'active',
      }));
    });

    it('throws ValidationError for empty name', async () => {
      await expect(service.create({ name: '   ', description: 'desc', ownerId: 'user-1' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for empty description', async () => {
      await expect(service.create({ name: 'Name', description: '   ', ownerId: 'user-1' })).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when owner does not exist', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      await expect(service.create({ name: 'Name', description: 'Desc', ownerId: 'missing' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('getById', () => {
    it('returns project when found', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(activeProject);
      const project = await service.getById('1');
      expect(project.name).toBe('My Project');
    });

    it('throws NotFoundError when project does not exist', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(null);
      await expect(service.getById('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listByOwner', () => {
    it('returns projects for given owner', async () => {
      vi.mocked(db.projects.findByUserId).mockResolvedValue([activeProject]);
      const projects = await service.listByOwner('user-1');
      expect(projects).toHaveLength(1);
      expect(projects[0].ownerId).toBe('user-1');
    });

    it('returns empty array when owner has no projects', async () => {
      vi.mocked(db.projects.findByUserId).mockResolvedValue([]);
      const projects = await service.listByOwner('user-2');
      expect(projects).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates project with valid input', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(activeProject);
      vi.mocked(db.projects.update).mockResolvedValue({ ...activeProject, name: 'Updated' });

      await service.update('1', { name: '  Updated  ' });

      expect(db.projects.update).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Updated' }));
    });

    it('updates only description when name is not provided', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(activeProject);
      vi.mocked(db.projects.update).mockResolvedValue({ ...activeProject, description: 'New desc' });

      await service.update('1', { description: 'New desc' });

      expect(db.projects.update).toHaveBeenCalledWith('1', expect.not.objectContaining({ name: expect.anything() }));
    });

    it('throws NotFoundError when project does not exist', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(null);
      await expect(service.update('999', { name: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when updating an archived project', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(archivedProject);
      await expect(service.update('1', { name: 'X' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for empty name', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(activeProject);
      await expect(service.update('1', { name: '   ' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for empty description', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(activeProject);
      await expect(service.update('1', { description: '   ' })).rejects.toThrow(ValidationError);
    });
  });

  describe('archive', () => {
    it('archives an active project', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(activeProject);
      vi.mocked(db.projects.update).mockResolvedValue(archivedProject);

      await service.archive('1');

      expect(db.projects.update).toHaveBeenCalledWith('1', expect.objectContaining({ status: 'archived' }));
    });

    it('throws NotFoundError when project does not exist', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(null);
      await expect(service.archive('999')).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when project is already archived', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(archivedProject);
      await expect(service.archive('1')).rejects.toThrow(ValidationError);
    });
  });
});
