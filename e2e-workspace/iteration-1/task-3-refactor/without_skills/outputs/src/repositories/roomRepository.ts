import type { Room } from '../models/room';
import { db } from '../db';

export interface RoomRepository {
  findById(id: string): Promise<Room | null>;
  findAll(): Promise<Room[]>;
  create(data: Omit<Room, 'id'>): Promise<Room>;
}

export class DbRoomRepository implements RoomRepository {
  async findById(id: string): Promise<Room | null> {
    return db.rooms.findById(id);
  }

  async findAll(): Promise<Room[]> {
    return db.rooms.findAll();
  }

  async create(data: Omit<Room, 'id'>): Promise<Room> {
    return db.rooms.create(data);
  }
}
