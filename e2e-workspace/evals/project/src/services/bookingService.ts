import { db } from '../db';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

interface Booking {
  id: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

interface CreateBookingInput {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

export class BookingService {
  async create(input: CreateBookingInput): Promise<Booking> {
    if (!input.title.trim()) throw new ValidationError('Booking title is required');
    if (input.startTime >= input.endTime) throw new ValidationError('Start time must be before end time');

    // Check room exists
    const room = await db.rooms.findById(input.roomId);
    if (!room) throw new NotFoundError('Room', input.roomId);

    // Check for conflicts — BUG: only checks exact match, not overlapping ranges
    const existing = await db.bookings.findByRoomAndTime(input.roomId, input.startTime, input.endTime);
    if (existing.length > 0) throw new ConflictError('Room is already booked for this time');

    return db.bookings.create(input);
  }

  async getByRoom(roomId: string): Promise<Booking[]> {
    return db.bookings.findByRoom(roomId);
  }

  async cancel(bookingId: string): Promise<void> {
    const booking = await db.bookings.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking', bookingId);
    await db.bookings.delete(bookingId);
  }
}
