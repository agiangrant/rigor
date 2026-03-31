import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomService } from '../services/roomService';
import { db } from '../db';
vi.mock('../db');

describe('RoomService', () => {
  const service = new RoomService();
  beforeEach(() => vi.clearAllMocks());

  it('creates a room', async () => {
    vi.mocked(db.rooms.create).mockResolvedValue({ id: '1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] });
    const room = await service.create({ name: 'Alpha', capacity: 10, floor: 1 });
    expect(room.name).toBe('Alpha');
  });
});
