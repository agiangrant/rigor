import { db } from '../db';
import { NotFoundError, ValidationError } from '../errors';
import type { Room } from '../models/room';

interface CreateRoomInput { name: string; capacity: number; floor: number; amenities?: string[]; }

export class RoomService {
  async getById(id: string): Promise<Room> {
    const room = await db.rooms.findById(id);
    if (!room) throw new NotFoundError('Room', id);
    return room;
  }

  async create(input: CreateRoomInput): Promise<Room> {
    if (!input.name.trim()) throw new ValidationError('Room name is required');
    if (input.capacity <= 0) throw new ValidationError('Capacity must be positive');
    return db.rooms.create({ ...input, amenities: input.amenities ?? [] });
  }

  async listAll(): Promise<Room[]> {
    return db.rooms.findAll();
  }
}
