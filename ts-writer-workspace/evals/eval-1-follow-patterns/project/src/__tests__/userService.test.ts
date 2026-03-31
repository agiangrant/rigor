import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/userService';
import { db } from '../db';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

vi.mock('../db');

describe('UserService', () => {
  const service = new UserService();
  beforeEach(() => vi.clearAllMocks());

  describe('getById', () => {
    it('returns user when found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', createdAt: new Date() });
      const user = await service.getById('1');
      expect(user.email).toBe('a@b.com');
    });

    it('throws NotFoundError when user does not exist', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      await expect(service.getById('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates user with valid input', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue(null);
      vi.mocked(db.users.create).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', createdAt: new Date() });
      const user = await service.create({ email: 'A@B.COM', name: '  Alice  ' });
      expect(db.users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.com', name: 'Alice' }));
    });

    it('throws ValidationError for invalid email', async () => {
      await expect(service.create({ email: 'invalid', name: 'Alice' })).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError for duplicate email', async () => {
      vi.mocked(db.users.findByEmail).mockResolvedValue({ id: '1' } as any);
      await expect(service.create({ email: 'a@b.com', name: 'Alice' })).rejects.toThrow(ConflictError);
    });
  });
});
