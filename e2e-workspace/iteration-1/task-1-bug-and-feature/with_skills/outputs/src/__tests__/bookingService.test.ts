import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from '../services/bookingService';
import { db } from '../db';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import type { Booking } from '../models/booking';

vi.mock('../db');

describe('BookingService', () => {
  const service = new BookingService();

  const baseInput = {
    roomId: 'room-1',
    userId: 'user-1',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    title: 'Team standup',
  };

  const existingBooking: Booking = {
    id: 'booking-1',
    roomId: 'room-1',
    userId: 'user-2',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    title: 'Existing meeting',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: room exists, no conflicts
    vi.mocked(db.rooms.findById).mockResolvedValue({
      id: 'room-1', name: 'Alpha', capacity: 10, floor: 1, amenities: [],
    });
    vi.mocked(db.bookings.findOverlapping).mockResolvedValue([]);
    vi.mocked(db.bookings.create).mockImplementation(async (data) => ({
      id: `booking-${Date.now()}`,
      ...data,
    }));
  });

  // --- Happy paths ---

  describe('create', () => {
    it('creates a booking successfully', async () => {
      const result = await service.create(baseInput);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        roomId: 'room-1',
        userId: 'user-1',
        title: 'Team standup',
      });
      expect(db.rooms.findById).toHaveBeenCalledWith('room-1');
      expect(db.bookings.findOverlapping).toHaveBeenCalledWith(
        'room-1',
        baseInput.startTime,
        baseInput.endTime,
      );
      expect(db.bookings.create).toHaveBeenCalledTimes(1);
    });

    it('returns the created booking with correct times', async () => {
      const result = await service.create(baseInput);

      expect(result[0].startTime).toEqual(baseInput.startTime);
      expect(result[0].endTime).toEqual(baseInput.endTime);
    });
  });

  // --- Validation ---

  describe('validation', () => {
    it('rejects empty title', async () => {
      await expect(service.create({ ...baseInput, title: '   ' }))
        .rejects.toThrow(ValidationError);
    });

    it('rejects start time equal to end time', async () => {
      const sameTime = new Date('2026-04-01T10:00:00Z');
      await expect(service.create({ ...baseInput, startTime: sameTime, endTime: sameTime }))
        .rejects.toThrow(ValidationError);
    });

    it('rejects start time after end time', async () => {
      await expect(service.create({
        ...baseInput,
        startTime: new Date('2026-04-01T12:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
      })).rejects.toThrow(ValidationError);
    });

    it('rejects booking for non-existent room', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue(null);

      await expect(service.create(baseInput))
        .rejects.toThrow(NotFoundError);
    });
  });

  // --- Conflict detection (bug fix: overlap ranges) ---

  describe('conflict detection', () => {
    it('rejects booking with exact same time range', async () => {
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([existingBooking]);

      await expect(service.create(baseInput))
        .rejects.toThrow(ConflictError);
    });

    it('rejects booking that starts during an existing booking', async () => {
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([existingBooking]);

      await expect(service.create({
        ...baseInput,
        startTime: new Date('2026-04-01T10:30:00Z'),
        endTime: new Date('2026-04-01T11:30:00Z'),
      })).rejects.toThrow(ConflictError);
    });

    it('rejects booking that ends during an existing booking', async () => {
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([existingBooking]);

      await expect(service.create({
        ...baseInput,
        startTime: new Date('2026-04-01T09:30:00Z'),
        endTime: new Date('2026-04-01T10:30:00Z'),
      })).rejects.toThrow(ConflictError);
    });

    it('rejects booking that completely contains an existing booking', async () => {
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([existingBooking]);

      await expect(service.create({
        ...baseInput,
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
      })).rejects.toThrow(ConflictError);
    });

    it('rejects booking contained within an existing booking', async () => {
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([existingBooking]);

      await expect(service.create({
        ...baseInput,
        startTime: new Date('2026-04-01T10:15:00Z'),
        endTime: new Date('2026-04-01T10:45:00Z'),
      })).rejects.toThrow(ConflictError);
    });

    it('allows booking that ends exactly when another starts (adjacent)', async () => {
      // Adjacent bookings should NOT conflict — findOverlapping returns empty
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([]);

      const result = await service.create({
        ...baseInput,
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
      });

      expect(result).toHaveLength(1);
    });

    it('allows booking in a different room at the same time', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue({
        id: 'room-2', name: 'Beta', capacity: 6, floor: 2, amenities: [],
      });
      vi.mocked(db.bookings.findOverlapping).mockResolvedValue([]);

      const result = await service.create({ ...baseInput, roomId: 'room-2' });

      expect(result).toHaveLength(1);
      expect(db.bookings.findOverlapping).toHaveBeenCalledWith(
        'room-2',
        baseInput.startTime,
        baseInput.endTime,
      );
    });
  });

  // --- Recurring bookings ---

  describe('recurring bookings', () => {
    it('creates daily recurring bookings with correct times', async () => {
      const result = await service.create({
        ...baseInput,
        recurrence: { type: 'daily', occurrences: 3 },
      });

      expect(result).toHaveLength(3);
      expect(result[0].startTime).toEqual(new Date('2026-04-01T10:00:00Z'));
      expect(result[0].endTime).toEqual(new Date('2026-04-01T11:00:00Z'));
      expect(result[1].startTime).toEqual(new Date('2026-04-02T10:00:00Z'));
      expect(result[1].endTime).toEqual(new Date('2026-04-02T11:00:00Z'));
      expect(result[2].startTime).toEqual(new Date('2026-04-03T10:00:00Z'));
      expect(result[2].endTime).toEqual(new Date('2026-04-03T11:00:00Z'));
      expect(db.bookings.create).toHaveBeenCalledTimes(3);
    });

    it('creates weekly recurring bookings with correct times', async () => {
      const result = await service.create({
        ...baseInput,
        recurrence: { type: 'weekly', occurrences: 3 },
      });

      expect(result).toHaveLength(3);
      expect(result[0].startTime).toEqual(new Date('2026-04-01T10:00:00Z'));
      expect(result[1].startTime).toEqual(new Date('2026-04-08T10:00:00Z'));
      expect(result[2].startTime).toEqual(new Date('2026-04-15T10:00:00Z'));
      expect(db.bookings.create).toHaveBeenCalledTimes(3);
    });

    it('conflict-checks every occurrence independently', async () => {
      const result = await service.create({
        ...baseInput,
        recurrence: { type: 'daily', occurrences: 3 },
      });

      expect(db.bookings.findOverlapping).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('rejects all bookings if any occurrence has a conflict', async () => {
      // Second occurrence conflicts
      vi.mocked(db.bookings.findOverlapping)
        .mockResolvedValueOnce([]) // first occurrence: no conflict
        .mockResolvedValueOnce([existingBooking]); // second occurrence: conflict

      await expect(service.create({
        ...baseInput,
        recurrence: { type: 'daily', occurrences: 3 },
      })).rejects.toThrow(ConflictError);

      // No bookings should have been created (atomic)
      expect(db.bookings.create).not.toHaveBeenCalled();
    });

    it('rejects recurrence with more than 52 occurrences', async () => {
      await expect(service.create({
        ...baseInput,
        recurrence: { type: 'weekly', occurrences: 53 },
      })).rejects.toThrow(ValidationError);
    });

    it('rejects recurrence with fewer than 2 occurrences', async () => {
      await expect(service.create({
        ...baseInput,
        recurrence: { type: 'daily', occurrences: 1 },
      })).rejects.toThrow(ValidationError);
    });

    it('preserves title and userId across all occurrences', async () => {
      const result = await service.create({
        ...baseInput,
        recurrence: { type: 'daily', occurrences: 3 },
      });

      for (const booking of result) {
        expect(booking.title).toBe('Team standup');
        expect(booking.userId).toBe('user-1');
        expect(booking.roomId).toBe('room-1');
      }
    });
  });

  // --- getByRoom ---

  describe('getByRoom', () => {
    it('returns bookings for a room', async () => {
      vi.mocked(db.bookings.findByRoom).mockResolvedValue([existingBooking]);

      const result = await service.getByRoom('room-1');

      expect(result).toEqual([existingBooking]);
      expect(db.bookings.findByRoom).toHaveBeenCalledWith('room-1');
    });

    it('returns empty array when no bookings exist', async () => {
      vi.mocked(db.bookings.findByRoom).mockResolvedValue([]);

      const result = await service.getByRoom('room-1');

      expect(result).toEqual([]);
    });
  });

  // --- cancel ---

  describe('cancel', () => {
    it('cancels an existing booking', async () => {
      vi.mocked(db.bookings.findById).mockResolvedValue(existingBooking);
      vi.mocked(db.bookings.delete).mockResolvedValue(undefined);

      await service.cancel('booking-1');

      expect(db.bookings.findById).toHaveBeenCalledWith('booking-1');
      expect(db.bookings.delete).toHaveBeenCalledWith('booking-1');
    });

    it('throws NotFoundError when booking does not exist', async () => {
      vi.mocked(db.bookings.findById).mockResolvedValue(null);

      await expect(service.cancel('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
