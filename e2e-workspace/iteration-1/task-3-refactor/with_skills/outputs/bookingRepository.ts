import type { Booking, CreateBookingInput } from '../models/booking';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  findByRoom(roomId: string): Promise<Booking[]>;
  findByRoomAndTime(roomId: string, start: Date, end: Date): Promise<Booking[]>;
  create(data: CreateBookingInput): Promise<Booking>;
  delete(id: string): Promise<void>;
}
