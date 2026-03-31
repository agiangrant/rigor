import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentService, NotFoundError, ForbiddenError } from '../services/commentService';
import { db } from '../db';

vi.mock('../db');

describe('CommentService', () => {
  const service = new CommentService();
  beforeEach(() => vi.clearAllMocks());

  describe('create', () => {
    it('creates a comment with timestamps', async () => {
      const input = { body: 'Great post!', authorId: 'user-1', resourceId: 'res-1' };
      vi.mocked(db.comments.create).mockResolvedValue({
        id: 'c1',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const comment = await service.create(input);

      expect(db.comments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Great post!',
          authorId: 'user-1',
          resourceId: 'res-1',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(comment.id).toBe('c1');
    });
  });

  describe('getByResource', () => {
    it('returns comments for a resource', async () => {
      const comments = [
        { id: 'c1', body: 'Nice', authorId: 'u1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() },
      ];
      vi.mocked(db.comments.findByResource).mockResolvedValue(comments);

      const result = await service.getByResource('r1');

      expect(result).toEqual(comments);
      expect(db.comments.findByResource).toHaveBeenCalledWith('r1');
    });

    it('returns empty array when no comments exist', async () => {
      vi.mocked(db.comments.findByResource).mockResolvedValue([]);

      const result = await service.getByResource('r-none');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns comment when found', async () => {
      const comment = { id: 'c1', body: 'Hi', authorId: 'u1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(db.comments.findById).mockResolvedValue(comment);

      const result = await service.getById('c1');

      expect(result).toEqual(comment);
    });

    it('returns null when not found', async () => {
      vi.mocked(db.comments.findById).mockResolvedValue(null);

      expect(await service.getById('c-missing')).toBeNull();
    });
  });

  describe('update', () => {
    it('updates comment when author matches', async () => {
      const existing = { id: 'c1', body: 'Old', authorId: 'u1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(db.comments.findById).mockResolvedValue(existing);
      vi.mocked(db.comments.update).mockResolvedValue({ ...existing, body: 'New', updatedAt: new Date() });

      const result = await service.update('c1', 'u1', { body: 'New' });

      expect(result.body).toBe('New');
      expect(db.comments.update).toHaveBeenCalledWith('c1', expect.objectContaining({ body: 'New', updatedAt: expect.any(Date) }));
    });

    it('throws NotFoundError when comment does not exist', async () => {
      vi.mocked(db.comments.findById).mockResolvedValue(null);

      await expect(service.update('c-missing', 'u1', { body: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when author does not match', async () => {
      const existing = { id: 'c1', body: 'Old', authorId: 'u1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(db.comments.findById).mockResolvedValue(existing);

      await expect(service.update('c1', 'u-other', { body: 'New' })).rejects.toThrow(ForbiddenError);
      expect(db.comments.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes comment when author matches', async () => {
      const existing = { id: 'c1', body: 'Bye', authorId: 'u1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(db.comments.findById).mockResolvedValue(existing);
      vi.mocked(db.comments.delete).mockResolvedValue(undefined);

      await service.delete('c1', 'u1');

      expect(db.comments.delete).toHaveBeenCalledWith('c1');
    });

    it('throws NotFoundError when comment does not exist', async () => {
      vi.mocked(db.comments.findById).mockResolvedValue(null);

      await expect(service.delete('c-missing', 'u1')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when author does not match', async () => {
      const existing = { id: 'c1', body: 'Nope', authorId: 'u1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(db.comments.findById).mockResolvedValue(existing);

      await expect(service.delete('c1', 'u-other')).rejects.toThrow(ForbiddenError);
      expect(db.comments.delete).not.toHaveBeenCalled();
    });
  });
});
