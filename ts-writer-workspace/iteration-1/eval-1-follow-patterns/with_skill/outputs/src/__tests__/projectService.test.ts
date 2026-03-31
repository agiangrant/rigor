import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from '../services/projectService';
import { db } from '../db';
import { NotFoundError, ValidationError } from '../errors';

vi.mock('../db');

describe('ProjectService', () => {
  const service = new ProjectService();
  beforeEach(() => vi.clearAllMocks());

  describe('create', () => {
    it('creates a project with valid input', async () => {
      const now = new Date();
      vi.mocked(db.projects.create).mockResolvedValue({
        id: '1',
        name: 'My Project',
        description: 'A description',
        ownerId: 'user-1',
        status: 'active',
        createdAt: now,
      });

      const project = await service.create({
        name: '  My Project  ',
        description: 'A description',
        ownerId: 'user-1',
      });

      expect(db.projects.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Project',
          description: 'A description',
          ownerId: 'user-1',
          status: 'active',
        })
      );
      expect(project.id).toBe('1');
    });

    it('throws ValidationError when name is empty', async () => {
      await expect(
        service.create({ name: '   ', description: 'desc', ownerId: 'user-1' })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when ownerId is empty', async () => {
      await expect(
        service.create({ name: 'Valid Name', description: 'desc', ownerId: '' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('returns project when found', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue({
        id: '1',
        name: 'My Project',
        description: 'desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      const project = await service.getById('1');
      expect(project.name).toBe('My Project');
    });

    it('throws NotFoundError when project does not exist', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(null);
      await expect(service.getById('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listByOwner', () => {
    it('returns projects for the given user', async () => {
      vi.mocked(db.projects.findByUserId).mockResolvedValue([
        { id: '1', name: 'P1', description: '', ownerId: 'user-1', status: 'active', createdAt: new Date() },
        { id: '2', name: 'P2', description: '', ownerId: 'user-1', status: 'archived', createdAt: new Date() },
      ]);

      const projects = await service.listByOwner('user-1');
      expect(projects).toHaveLength(2);
      expect(db.projects.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('returns empty array when user has no projects', async () => {
      vi.mocked(db.projects.findByUserId).mockResolvedValue([]);
      const projects = await service.listByOwner('user-1');
      expect(projects).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates name and description', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue({
        id: '1',
        name: 'Old Name',
        description: 'Old desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });
      vi.mocked(db.projects.update).mockResolvedValue({
        id: '1',
        name: 'New Name',
        description: 'New desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      const project = await service.update('1', { name: '  New Name  ', description: 'New desc' });
      expect(db.projects.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ name: 'New Name', description: 'New desc' })
      );
    });

    it('allows partial update with only name', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue({
        id: '1',
        name: 'Old',
        description: 'desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });
      vi.mocked(db.projects.update).mockResolvedValue({
        id: '1',
        name: 'Updated',
        description: 'desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      await service.update('1', { name: 'Updated' });
      expect(db.projects.update).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Updated' }));
    });

    it('throws NotFoundError when project does not exist', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(null);
      await expect(service.update('999', { name: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when name is set to empty', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue({
        id: '1',
        name: 'Existing',
        description: 'desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      await expect(service.update('1', { name: '   ' })).rejects.toThrow(ValidationError);
    });
  });

  describe('archive', () => {
    it('sets status to archived', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue({
        id: '1',
        name: 'P1',
        description: 'desc',
        ownerId: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });
      vi.mocked(db.projects.update).mockResolvedValue({
        id: '1',
        name: 'P1',
        description: 'desc',
        ownerId: 'user-1',
        status: 'archived',
        createdAt: new Date(),
      });

      const project = await service.archive('1');
      expect(db.projects.update).toHaveBeenCalledWith('1', { status: 'archived' });
      expect(project.status).toBe('archived');
    });

    it('throws NotFoundError when project does not exist', async () => {
      vi.mocked(db.projects.findById).mockResolvedValue(null);
      await expect(service.archive('999')).rejects.toThrow(NotFoundError);
    });
  });
});
