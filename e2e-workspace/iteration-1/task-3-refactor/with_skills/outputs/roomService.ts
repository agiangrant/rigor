import { NotFoundError, ValidationError } from '../errors';
import type { Room } from '../models/room';
import type { RoomRepository, CreateRoomInput } from '../repositories/roomRepository';

export class RoomService {
  constructor(private readonly roomRepo: RoomRepository) {}

  async getById(id: string): Promise<Room> {
    const room = await this.roomRepo.findById(id);
    if (!room) throw new NotFoundError('Room', id);
    return room;
  }

  async create(input: CreateRoomInput): Promise<Room> {
    if (!input.name.trim()) throw new ValidationError('Room name is required');
    if (input.capacity <= 0) throw new ValidationError('Capacity must be positive');
    return this.roomRepo.create({ ...input, amenities: input.amenities ?? [] });
  }

  async listAll(): Promise<Room[]> {
    return this.roomRepo.findAll();
  }
}
