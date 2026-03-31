import { db } from '../db';
import { NotFoundError, ValidationError, ConflictError } from '../errors';
import { NotificationService } from '../notifications/notificationService';
import type { Booking, CreateBookingInput } from '../models/booking';
import type { Room } from '../models/room';

/**
 * Updated BookingService with notification support.
 * NotificationService is injected via constructor -- if not provided,
 * notifications are silently skipped (backwards compatible).
 */
export class BookingService {
  private notificationService: NotificationService | null;

  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService ?? null;
  }

  async create(input: CreateBookingInput): Promise<Booking> {
    if (!input.title.trim()) throw new ValidationError('Booking title is required');
    if (input.startTime >= input.endTime) throw new ValidationError('Start time must be before end time');

    const room = (await db.rooms.findById(input.roomId)) as Room | null;
    if (!room) throw new NotFoundError('Room', input.roomId);

    const existing = await db.bookings.findByRoomAndTime(input.roomId, input.startTime, input.endTime);
    if (existing.length > 0) throw new ConflictError('Room is already booked for this time');

    const booking = (await db.bookings.create(input)) as Booking;

    // Fire-and-forget: notification failure must not break booking creation
    if (this.notificationService && room.ownerEmail) {
      this.notificationService
        .notifyBookingCreated({
          ownerEmail: room.ownerEmail,
          roomName: room.name,
          bookerName: input.userId,
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
        })
        .catch((err) => {
          console.error('Failed to send booking creation notification:', err);
        });
    }

    return booking;
  }

  async getByRoom(roomId: string): Promise<Booking[]> {
    return db.bookings.findByRoom(roomId) as Promise<Booking[]>;
  }

  async cancel(bookingId: string): Promise<void> {
    const booking = (await db.bookings.findById(bookingId)) as Booking | null;
    if (!booking) throw new NotFoundError('Booking', bookingId);

    // Look up room name for the notification
    const room = (await db.rooms.findById(booking.roomId)) as Room | null;

    await db.bookings.delete(bookingId);

    // Fire-and-forget: notification failure must not break cancellation
    if (this.notificationService && booking.userEmail) {
      this.notificationService
        .notifyBookingCancelled({
          bookerEmail: booking.userEmail,
          roomName: room?.name ?? 'Unknown room',
          title: booking.title,
          startTime: booking.startTime,
          endTime: booking.endTime,
        })
        .catch((err) => {
          console.error('Failed to send booking cancellation notification:', err);
        });
    }
  }
}
