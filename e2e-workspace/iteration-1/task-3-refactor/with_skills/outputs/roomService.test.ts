import { describe, it, expect, beforeEach } from 'vitest';
import { RoomService } from '../services/roomService';
import type { RoomRepository } from '../repositories/roomRepository';
import type { Room } from '../models/room';

function createMockRoomRepo(overrides: Partial<RoomRepository> = {}): RoomRepository {
  return {
    findById: async () => null,
    findAll: async () => [],
    create: async (data) => ({ id: '1', ...data, amenities: data.amenities ?? [] }),
    ...overrides,
  };
}

describe('RoomService', () => {
  let service: RoomService;
  let repo: RoomRepository;

  describe('create', () => {
    it('creates a room with valid input', async () => {
      repo = createMockRoomRepo();
      service = new RoomService(repo);

      const room = await service.create({ name: 'Alpha', capacity: 10, floor: 1 });
      expect(room.name).toBe('Alpha');
      expect(room.capacity).toBe(10);
      expect(room.amenities).toEqual([]);
    });

    it('creates a room with amenities', async () => {
      repo = createMockRoomRepo();
      service = new RoomService(repo);

      const room = await service.create({ name: 'Beta', capacity: 5, floor: 2, amenities: ['projector'] });
      expect(room.amenities).toEqual(['projector']);
    });

    it('throws ValidationError for empty name', async () => {
      repo = createMockRoomRepo();
      service = new RoomService(repo);

      await expect(service.create({ name: '', capacity: 10, floor: 1 })).rejects.toThrow('Room name is required');
    });

    it('throws ValidationError for whitespace-only name', async () => {
      repo = createMockRoomRepo();
      service = new RoomService(repo);

      await expect(service.create({ name: '   ', capacity: 10, floor: 1 })).rejects.toThrow('Room name is required');
    });

    it('throws ValidationError for zero capacity', async () => {
      repo = createMockRoomRepo();
      service = new RoomService(repo);

      await expect(service.create({ name: 'Alpha', capacity: 0, floor: 1 })).rejects.toThrow('Capacity must be positive');
    });

    it('throws ValidationError for negative capacity', async () => {
      repo = createMockRoomRepo();
      service = new RoomService(repo);

      await expect(service.create({ name: 'Alpha', capacity: -1, floor: 1 })).rejects.toThrow('Capacity must be positive');
    });
  });

  describe('getById', () => {
    it('returns the room when found', async () => {
      const existingRoom: Room = { id: '1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] };
      repo = createMockRoomRepo({ findById: async () => existingRoom });
      service = new RoomService(repo);

      const room = await service.getById('1');
      expect(room).toEqual(existingRoom);
    });

    it('throws NotFoundError when room does not exist', async () => {
      repo = createMockRoomRepo({ findById: async () => null });
      service = new RoomService(repo);

      await expect(service.getById('999')).rejects.toThrow('Room not found: 999');
    });
  });

  describe('listAll', () => {
    it('returns all rooms', async () => {
      const rooms: Room[] = [
        { id: '1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] },
        { id: '2', name: 'Beta', capacity: 5, floor: 2, amenities: ['projector'] },
      ];
      repo = createMockRoomRepo({ findAll: async () => rooms });
      service = new RoomService(repo);

      const result = await service.listAll();
      expect(result).toEqual(rooms);
    });

    it('returns empty array when no rooms exist', async () => {
      repo = createMockRoomRepo({ findAll: async () => [] });
      service = new RoomService(repo);

      const result = await service.listAll();
      expect(result).toEqual([]);
    });
  });
});
