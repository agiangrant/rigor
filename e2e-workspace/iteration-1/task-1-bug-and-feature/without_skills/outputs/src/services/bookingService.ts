import { db } from '../db';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
  recurrenceGroupId?: string;
}

export interface CreateBookingInput {
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

export type RecurrencePattern = 'daily' | 'weekly';

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  count: number; // total number of occurrences (including the first)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateOccurrences(
  input: CreateBookingInput,
  rule: RecurrenceRule,
): CreateBookingInput[] {
  const intervalDays = rule.pattern === 'daily' ? 1 : 7;
  const occurrences: CreateBookingInput[] = [];

  for (let i = 0; i < rule.count; i++) {
    const offsetDays = i * intervalDays;
    occurrences.push({
      ...input,
      startTime: addDays(input.startTime, offsetDays),
      endTime: addDays(input.endTime, offsetDays),
    });
  }

  return occurrences;
}

export class BookingService {
  async create(input: CreateBookingInput): Promise<Booking> {
    if (!input.title.trim()) throw new ValidationError('Booking title is required');
    if (input.startTime >= input.endTime) throw new ValidationError('Start time must be before end time');

    // Check room exists
    const room = await db.rooms.findById(input.roomId);
    if (!room) throw new NotFoundError('Room', input.roomId);

    // Check for conflicts using overlap logic:
    // Two intervals overlap when startA < endB && startB < endA
    const overlapping = await db.bookings.findByRoomAndTime(input.roomId, input.startTime, input.endTime);
    if (overlapping.length > 0) throw new ConflictError('Room is already booked for this time');

    return db.bookings.create(input);
  }

  async createRecurring(
    input: CreateBookingInput,
    rule: RecurrenceRule,
  ): Promise<Booking[]> {
    if (rule.count < 1) throw new ValidationError('Recurrence count must be at least 1');
    if (rule.pattern !== 'daily' && rule.pattern !== 'weekly') {
      throw new ValidationError('Recurrence pattern must be "daily" or "weekly"');
    }

    const occurrences = generateOccurrences(input, rule);
    const groupId = crypto.randomUUID();

    // Validate all occurrences first (all-or-nothing)
    for (const occurrence of occurrences) {
      if (!occurrence.title.trim()) throw new ValidationError('Booking title is required');
      if (occurrence.startTime >= occurrence.endTime) throw new ValidationError('Start time must be before end time');

      const room = await db.rooms.findById(occurrence.roomId);
      if (!room) throw new NotFoundError('Room', occurrence.roomId);

      const overlapping = await db.bookings.findByRoomAndTime(
        occurrence.roomId,
        occurrence.startTime,
        occurrence.endTime,
      );
      if (overlapping.length > 0) {
        throw new ConflictError(
          `Room is already booked for ${occurrence.startTime.toISOString()} - ${occurrence.endTime.toISOString()}`,
        );
      }
    }

    // All validated — create them
    const created: Booking[] = [];
    for (const occurrence of occurrences) {
      const booking = await db.bookings.create({
        ...occurrence,
        recurrenceGroupId: groupId,
      });
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

  async cancelRecurring(recurrenceGroupId: string): Promise<void> {
    const bookings = await db.bookings.findByRecurrenceGroup(recurrenceGroupId);
    if (bookings.length === 0) throw new NotFoundError('RecurrenceGroup', recurrenceGroupId);
    for (const booking of bookings) {
      await db.bookings.delete(booking.id);
    }
  }
}
