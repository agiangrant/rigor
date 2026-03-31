import { NotFoundError, ValidationError, ConflictError } from '../errors';
import type { Booking, CreateBookingInput } from '../models/booking';
import type { BookingRepository } from '../repositories/bookingRepository';
import type { RoomRepository } from '../repositories/roomRepository';

export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly roomRepo: RoomRepository,
  ) {}

  async create(input: CreateBookingInput): Promise<Booking> {
    if (!input.title.trim()) throw new ValidationError('Booking title is required');
    if (input.startTime >= input.endTime) throw new ValidationError('Start time must be before end time');

    // Check room exists
    const room = await this.roomRepo.findById(input.roomId);
    if (!room) throw new NotFoundError('Room', input.roomId);

    // Check for conflicts — BUG: only checks exact match, not overlapping ranges
    const existing = await this.bookingRepo.findByRoomAndTime(input.roomId, input.startTime, input.endTime);
    if (existing.length > 0) throw new ConflictError('Room is already booked for this time');

    return this.bookingRepo.create(input);
  }

  async getByRoom(roomId: string): Promise<Booking[]> {
    return this.bookingRepo.findByRoom(roomId);
  }

  async cancel(bookingId: string): Promise<void> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking', bookingId);
    await this.bookingRepo.delete(bookingId);
  }
}
