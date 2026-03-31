import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomService } from '../services/roomService';
import type { RoomRepository } from '../repositories/roomRepository';
import { NotFoundError, ValidationError } from '../errors';

function createMockRoomRepo(): RoomRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async (data) => ({ id: '1', ...data })),
  };
}

describe('RoomService', () => {
  let repo: ReturnType<typeof createMockRoomRepo>;
  let service: RoomService;

  beforeEach(() => {
    repo = createMockRoomRepo();
    service = new RoomService(repo);
  });

  it('creates a room', async () => {
    vi.mocked(repo.create).mockResolvedValue({ id: '1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] });
    const room = await service.create({ name: 'Alpha', capacity: 10, floor: 1 });
    expect(room.name).toBe('Alpha');
    expect(repo.create).toHaveBeenCalledWith({ name: 'Alpha', capacity: 10, floor: 1, amenities: [] });
  });

  it('rejects empty room name', async () => {
    await expect(service.create({ name: '  ', capacity: 10, floor: 1 })).rejects.toThrow(ValidationError);
  });

  it('rejects non-positive capacity', async () => {
    await expect(service.create({ name: 'Beta', capacity: 0, floor: 1 })).rejects.toThrow(ValidationError);
  });

  it('gets a room by id', async () => {
    vi.mocked(repo.findById).mockResolvedValue({ id: '1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] });
    const room = await service.getById('1');
    expect(room.id).toBe('1');
    expect(repo.findById).toHaveBeenCalledWith('1');
  });

  it('throws NotFoundError when room does not exist', async () => {
    await expect(service.getById('missing')).rejects.toThrow(NotFoundError);
  });

  it('lists all rooms', async () => {
    const rooms = [{ id: '1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] }];
    vi.mocked(repo.findAll).mockResolvedValue(rooms);
    const result = await service.listAll();
    expect(result).toEqual(rooms);
  });
});
