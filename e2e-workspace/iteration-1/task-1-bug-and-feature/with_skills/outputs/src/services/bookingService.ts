import { db } from '../db';
import { NotFoundError, ValidationError, ConflictError } from '../errors';
import type { Booking, CreateBookingInput } from '../models/booking';

const MAX_RECURRENCE_OCCURRENCES = 52;
const MIN_RECURRENCE_OCCURRENCES = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export class BookingService {
  async create(input: CreateBookingInput): Promise<Booking[]> {
    if (!input.title.trim()) throw new ValidationError('Booking title is required');
    if (input.startTime >= input.endTime) throw new ValidationError('Start time must be before end time');

    if (input.recurrence) {
      this.validateRecurrence(input.recurrence.occurrences);
    }

    const room = await db.rooms.findById(input.roomId);
    if (!room) throw new NotFoundError('Room', input.roomId);

    const occurrences = this.generateOccurrences(input);

    // Check all occurrences for conflicts before creating any (atomic)
    for (const occurrence of occurrences) {
      const conflicts = await db.bookings.findOverlapping(
        input.roomId,
        occurrence.startTime,
        occurrence.endTime,
      );
      if (conflicts.length > 0) {
        throw new ConflictError('Room is already booked for this time');
      }
    }

    // All clear — create all bookings
    const created: Booking[] = [];
    for (const occurrence of occurrences) {
      const booking = await db.bookings.create(occurrence);
      created.push(booking);
    }

    return created;
  }

  async getByRoom(roomId: string): Promise<Booking[]> {
    return db.bookings.findByRoom(roomId);
  }

  async cancel(bookingId: string): Promise<void> {
    const booking = await db.bookings.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking', bookingId);
    await db.bookings.delete(bookingId);
  }

  private validateRecurrence(occurrences: number): void {
    if (occurrences < MIN_RECURRENCE_OCCURRENCES) {
      throw new ValidationError(`Recurrence must have at least ${MIN_RECURRENCE_OCCURRENCES} occurrences`);
    }
    if (occurrences > MAX_RECURRENCE_OCCURRENCES) {
      throw new ValidationError(`Recurrence cannot exceed ${MAX_RECURRENCE_OCCURRENCES} occurrences`);
    }
  }

  private generateOccurrences(input: CreateBookingInput): Omit<Booking, 'id'>[] {
    const count = input.recurrence?.occurrences ?? 1;
    const intervalMs = input.recurrence?.type === 'weekly' ? MS_PER_WEEK : MS_PER_DAY;
    const occurrences: Omit<Booking, 'id'>[] = [];

    for (let i = 0; i < count; i++) {
      const offsetMs = input.recurrence ? i * intervalMs : 0;
      occurrences.push({
        roomId: input.roomId,
        userId: input.userId,
        title: input.title,
        startTime: new Date(input.startTime.getTime() + offsetMs),
        endTime: new Date(input.endTime.getTime() + offsetMs),
      });
    }

    return occurrences;
  }
}
