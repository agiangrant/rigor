import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/userService';
import { db } from '../db';

vi.mock('../db');

describe('UserService', () => {
  const service = new UserService();
  beforeEach(() => vi.clearAllMocks());

  describe('getById', () => {
    it('returns user when found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue({ id: '1', email: 'a@b.com', name: 'Alice', role: 'editor' });
      const user = await service.getById('1');
      expect(user?.email).toBe('a@b.com');
    });

    it('returns null when not found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      expect(await service.getById('999')).toBeNull();
    });
  });
});
