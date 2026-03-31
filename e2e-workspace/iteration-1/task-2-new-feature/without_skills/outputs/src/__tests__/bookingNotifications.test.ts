import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from '../services/bookingService';
import { NotificationService } from '../notifications/notificationService';
import { db } from '../db';

vi.mock('../db');

describe('BookingService with notifications', () => {
  let notificationService: NotificationService;
  let service: BookingService;
  let notifyCreatedSpy: ReturnType<typeof vi.fn>;
  let notifyCancelledSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    notificationService = new NotificationService([]);
    notifyCreatedSpy = vi.fn().mockResolvedValue(undefined);
    notifyCancelledSpy = vi.fn().mockResolvedValue(undefined);
    notificationService.notifyBookingCreated = notifyCreatedSpy;
    notificationService.notifyBookingCancelled = notifyCancelledSpy;

    service = new BookingService(notificationService);
  });

  describe('create', () => {
    it('notifies room owner when booking is created', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-1',
        name: 'Alpha',
        capacity: 10,
        floor: 1,
        amenities: [],
        ownerEmail: 'owner@example.com',
      });
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      vi.mocked(db.bookings.create).mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      await service.create({
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      // Allow fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 0));

      expect(notifyCreatedSpy).toHaveBeenCalledWith({
        ownerEmail: 'owner@example.com',
        roomName: 'Alpha',
        bookerName: 'user-1',
        title: 'Standup',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
      });
    });

    it('still creates booking when notification fails', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-1',
        name: 'Alpha',
        capacity: 10,
        floor: 1,
        amenities: [],
        ownerEmail: 'owner@example.com',
      });
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      vi.mocked(db.bookings.create).mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      notifyCreatedSpy.mockRejectedValue(new Error('Email service down'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const booking = await service.create({
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      expect(booking.id).toBe('booking-1');

      // Allow fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 0));

      consoleSpy.mockRestore();
    });

    it('skips notification when room has no ownerEmail', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-1',
        name: 'Alpha',
        capacity: 10,
        floor: 1,
        amenities: [],
      });
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      vi.mocked(db.bookings.create).mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      await service.create({
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(notifyCreatedSpy).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('sends cancellation confirmation to booker', async () => {
      vi.mocked(db.bookings.findById).mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });
      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-1',
        name: 'Alpha',
        capacity: 10,
        floor: 1,
        amenities: [],
        ownerEmail: 'owner@example.com',
      });
      vi.mocked(db.bookings.delete).mockResolvedValue(undefined);

      await service.cancel('booking-1');

      await new Promise((r) => setTimeout(r, 0));

      expect(notifyCancelledSpy).toHaveBeenCalledWith({
        bookerEmail: 'booker@example.com',
        roomName: 'Alpha',
        title: 'Standup',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
      });
    });

    it('still cancels booking when notification fails', async () => {
      vi.mocked(db.bookings.findById).mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });
      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-1',
        name: 'Alpha',
        capacity: 10,
        floor: 1,
        amenities: [],
        ownerEmail: 'owner@example.com',
      });
      vi.mocked(db.bookings.delete).mockResolvedValue(undefined);

      notifyCancelledSpy.mockRejectedValue(new Error('Slack down'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.cancel('booking-1')).resolves.toBeUndefined();

      await new Promise((r) => setTimeout(r, 0));

      expect(db.bookings.delete).toHaveBeenCalledWith('booking-1');
      consoleSpy.mockRestore();
    });
  });

  describe('without notification service', () => {
    it('works without notification service (backwards compatible)', async () => {
      const plainService = new BookingService();

      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-1',
        name: 'Alpha',
        capacity: 10,
        floor: 1,
        amenities: [],
        ownerEmail: 'owner@example.com',
      });
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      vi.mocked(db.bookings.create).mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      const booking = await plainService.create({
        roomId: 'room-1',
        userId: 'user-1',
        userEmail: 'booker@example.com',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
        title: 'Standup',
      });

      expect(booking.id).toBe('booking-1');
    });
  });
});
