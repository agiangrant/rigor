import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from '../services/bookingService';
import { db } from '../db';
import { ValidationError, NotFoundError, ConflictError } from '../errors';

vi.mock('../db');

// Helpers
const makeDate = (iso: string) => new Date(iso);

const validInput = {
  roomId: 'room-1',
  userId: 'user-1',
  startTime: makeDate('2026-04-01T10:00:00Z'),
  endTime: makeDate('2026-04-01T11:00:00Z'),
  title: 'Standup',
};

const fakeRoom = { id: 'room-1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] };

describe('BookingService', () => {
  const service = new BookingService();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    vi.mocked(db.rooms.findById).mockResolvedValue(fakeRoom);
    vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
    vi.mocked(db.bookings.create).mockImplementation(async (data: any) => ({
      id: crypto.randomUUID(),
      ...data,
    }));
    vi.mocked(db.bookings.findById).mockResolvedValue(null);
    vi.mocked(db.bookings.delete).mockResolvedValue(undefined);
    vi.mocked(db.bookings.findByRoom).mockResolvedValue([]);
    vi.mocked(db.bookings.findByRecurrenceGroup).mockResolvedValue([]);
  });

  // ---------- Validation ----------

  describe('validation', () => {
    it('rejects empty title', async () => {
      await expect(service.create({ ...validInput, title: '   ' })).rejects.toThrow(ValidationError);
    });

    it('rejects start time equal to end time', async () => {
      const t = makeDate('2026-04-01T10:00:00Z');
      await expect(service.create({ ...validInput, startTime: t, endTime: t })).rejects.toThrow(
        'Start time must be before end time',
      );
    });

    it('rejects start time after end time', async () => {
      await expect(
        service.create({
          ...validInput,
          startTime: makeDate('2026-04-01T12:00:00Z'),
          endTime: makeDate('2026-04-01T10:00:00Z'),
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ---------- Room existence ----------

  describe('room existence', () => {
    it('throws NotFoundError for nonexistent room', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue(null);
      await expect(service.create(validInput)).rejects.toThrow(NotFoundError);
    });
  });

  // ---------- Conflict detection (bug fix) ----------

  describe('conflict detection', () => {
    const existingBooking = {
      id: 'existing-1',
      roomId: 'room-1',
      userId: 'user-2',
      startTime: makeDate('2026-04-01T10:00:00Z'),
      endTime: makeDate('2026-04-01T11:00:00Z'),
      title: 'Existing',
    };

    it('rejects exact time overlap', async () => {
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([existingBooking]);
      await expect(service.create(validInput)).rejects.toThrow(ConflictError);
    });

    it('rejects partial overlap (new booking starts during existing)', async () => {
      // Existing: 10:00-11:00, New: 10:30-11:30
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([existingBooking]);
      await expect(
        service.create({
          ...validInput,
          startTime: makeDate('2026-04-01T10:30:00Z'),
          endTime: makeDate('2026-04-01T11:30:00Z'),
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects partial overlap (new booking ends during existing)', async () => {
      // Existing: 10:00-11:00, New: 09:30-10:30
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([existingBooking]);
      await expect(
        service.create({
          ...validInput,
          startTime: makeDate('2026-04-01T09:30:00Z'),
          endTime: makeDate('2026-04-01T10:30:00Z'),
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects when new booking fully encloses existing', async () => {
      // Existing: 10:00-11:00, New: 09:00-12:00
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([existingBooking]);
      await expect(
        service.create({
          ...validInput,
          startTime: makeDate('2026-04-01T09:00:00Z'),
          endTime: makeDate('2026-04-01T12:00:00Z'),
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects when new booking is fully enclosed by existing', async () => {
      // Existing: 10:00-11:00, New: 10:15-10:45
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([existingBooking]);
      await expect(
        service.create({
          ...validInput,
          startTime: makeDate('2026-04-01T10:15:00Z'),
          endTime: makeDate('2026-04-01T10:45:00Z'),
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('allows adjacent booking ending at existing start (no overlap)', async () => {
      // Existing: 10:00-11:00, New: 09:00-10:00 (ends exactly when existing starts)
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      const result = await service.create({
        ...validInput,
        startTime: makeDate('2026-04-01T09:00:00Z'),
        endTime: makeDate('2026-04-01T10:00:00Z'),
      });
      expect(result).toBeDefined();
      expect(result.title).toBe('Standup');
    });

    it('allows adjacent booking starting at existing end (no overlap)', async () => {
      // Existing: 10:00-11:00, New: 11:00-12:00
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      const result = await service.create({
        ...validInput,
        startTime: makeDate('2026-04-01T11:00:00Z'),
        endTime: makeDate('2026-04-01T12:00:00Z'),
      });
      expect(result).toBeDefined();
    });

    it('allows booking in a different room', async () => {
      vi.mocked(db.bookings.findByRoomAndTime).mockResolvedValue([]);
      const result = await service.create({ ...validInput, roomId: 'room-2' });
      expect(result.roomId).toBe('room-2');
    });
  });

  // ---------- Successful creation ----------

  describe('successful creation', () => {
    it('creates a booking and returns it with an id', async () => {
      const result = await service.create(validInput);
      expect(result.id).toBeDefined();
      expect(result.roomId).toBe('room-1');
      expect(result.userId).toBe('user-1');
      expect(result.title).toBe('Standup');
      expect(db.bookings.create).toHaveBeenCalledWith(validInput);
    });

    it('calls findByRoomAndTime with the correct arguments', async () => {
      await service.create(validInput);
      expect(db.bookings.findByRoomAndTime).toHaveBeenCalledWith(
        'room-1',
        validInput.startTime,
        validInput.endTime,
      );
    });
  });

  // ---------- Cancellation ----------

  describe('cancellation', () => {
    it('cancels an existing booking', async () => {
      vi.mocked(db.bookings.findById).mockResolvedValue({ id: 'b-1', ...validInput });
      await service.cancel('b-1');
      expect(db.bookings.delete).toHaveBeenCalledWith('b-1');
    });

    it('throws NotFoundError when cancelling nonexistent booking', async () => {
      vi.mocked(db.bookings.findById).mockResolvedValue(null);
      await expect(service.cancel('nope')).rejects.toThrow(NotFoundError);
    });
  });

  // ---------- getByRoom ----------

  describe('getByRoom', () => {
    it('returns bookings for a room', async () => {
      const bookings = [{ id: 'b-1', ...validInput }];
      vi.mocked(db.bookings.findByRoom).mockResolvedValue(bookings);
      const result = await service.getByRoom('room-1');
      expect(result).toEqual(bookings);
    });
  });

  // ---------- Recurring bookings ----------

  describe('createRecurring', () => {
    it('creates daily recurring bookings', async () => {
      const rule = { pattern: 'daily' as const, count: 3 };
      const results = await service.createRecurring(validInput, rule);

      expect(results).toHaveLength(3);
      expect(db.bookings.create).toHaveBeenCalledTimes(3);

      // Verify dates are sequential days
      const starts = results.map((b) => new Date(b.startTime).toISOString());
      expect(starts).toEqual([
        '2026-04-01T10:00:00.000Z',
        '2026-04-02T10:00:00.000Z',
        '2026-04-03T10:00:00.000Z',
      ]);
    });

    it('creates weekly recurring bookings', async () => {
      const rule = { pattern: 'weekly' as const, count: 3 };
      const results = await service.createRecurring(validInput, rule);

      expect(results).toHaveLength(3);

      const starts = results.map((b) => new Date(b.startTime).toISOString());
      expect(starts).toEqual([
        '2026-04-01T10:00:00.000Z',
        '2026-04-08T10:00:00.000Z',
        '2026-04-15T10:00:00.000Z',
      ]);
    });

    it('assigns the same recurrenceGroupId to all occurrences', async () => {
      const rule = { pattern: 'daily' as const, count: 3 };
      const results = await service.createRecurring(validInput, rule);

      const groupIds = results.map((b) => b.recurrenceGroupId);
      expect(groupIds[0]).toBeDefined();
      expect(new Set(groupIds).size).toBe(1); // all same
    });

    it('rejects all bookings if any occurrence conflicts (all-or-nothing)', async () => {
      // The second call to findByRoomAndTime returns a conflict
      vi.mocked(db.bookings.findByRoomAndTime)
        .mockResolvedValueOnce([]) // first occurrence OK
        .mockResolvedValueOnce([{ id: 'existing', ...validInput }]); // second conflicts

      const rule = { pattern: 'daily' as const, count: 3 };
      await expect(service.createRecurring(validInput, rule)).rejects.toThrow(ConflictError);
      expect(db.bookings.create).not.toHaveBeenCalled();
    });

    it('rejects count less than 1', async () => {
      const rule = { pattern: 'daily' as const, count: 0 };
      await expect(service.createRecurring(validInput, rule)).rejects.toThrow(ValidationError);
    });

    it('validates title for recurring bookings', async () => {
      const rule = { pattern: 'daily' as const, count: 2 };
      await expect(
        service.createRecurring({ ...validInput, title: '  ' }, rule),
      ).rejects.toThrow(ValidationError);
    });

    it('checks room existence for recurring bookings', async () => {
      vi.mocked(db.rooms.findById).mockResolvedValue(null);
      const rule = { pattern: 'daily' as const, count: 2 };
      await expect(service.createRecurring(validInput, rule)).rejects.toThrow(NotFoundError);
    });
  });

  // ---------- Cancel recurring ----------

  describe('cancelRecurring', () => {
    it('cancels all bookings in a recurrence group', async () => {
      const groupBookings = [
        { id: 'b-1', ...validInput, recurrenceGroupId: 'group-1' },
        { id: 'b-2', ...validInput, recurrenceGroupId: 'group-1' },
        { id: 'b-3', ...validInput, recurrenceGroupId: 'group-1' },
      ];
      vi.mocked(db.bookings.findByRecurrenceGroup).mockResolvedValue(groupBookings);

      await service.cancelRecurring('group-1');

      expect(db.bookings.delete).toHaveBeenCalledTimes(3);
      expect(db.bookings.delete).toHaveBeenCalledWith('b-1');
      expect(db.bookings.delete).toHaveBeenCalledWith('b-2');
      expect(db.bookings.delete).toHaveBeenCalledWith('b-3');
    });

    it('throws NotFoundError for unknown recurrence group', async () => {
      vi.mocked(db.bookings.findByRecurrenceGroup).mockResolvedValue([]);
      await expect(service.cancelRecurring('nope')).rejects.toThrow(NotFoundError);
    });
  });
});
