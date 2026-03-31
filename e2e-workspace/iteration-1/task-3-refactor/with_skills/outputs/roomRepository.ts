import type { Room } from '../models/room';

export interface CreateRoomInput {
  name: string;
  capacity: number;
  floor: number;
  amenities?: string[];
}

export interface RoomRepository {
  findById(id: string): Promise<Room | null>;
  findAll(): Promise<Room[]>;
  create(data: CreateRoomInput): Promise<Room>;
}
