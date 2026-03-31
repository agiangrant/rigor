import type { Booking, CreateBookingInput } from '../models/booking';
import { db } from '../db';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByRoom(roomId: string): Promise<Booking[]>;
  findByRoomAndTime(roomId: string, start: Date, end: Date): Promise<Booking[]>;
  create(data: CreateBookingInput): Promise<Booking>;
  delete(id: string): Promise<void>;
}

export class DbBookingRepository implements BookingRepository {
  async findById(id: string): Promise<Booking | null> {
    return db.bookings.findById(id);
  }

  async findByRoom(roomId: string): Promise<Booking[]> {
    return db.bookings.findByRoom(roomId);
  }

  async findByRoomAndTime(roomId: string, start: Date, end: Date): Promise<Booking[]> {
    return db.bookings.findByRoomAndTime(roomId, start, end);
  }

  async create(data: CreateBookingInput): Promise<Booking> {
    return db.bookings.create(data);
  }

  async delete(id: string): Promise<void> {
    return db.bookings.delete(id);
  }
}
