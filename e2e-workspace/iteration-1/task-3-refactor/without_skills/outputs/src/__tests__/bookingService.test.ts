import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from '../services/bookingService';
import type { BookingRepository } from '../repositories/bookingRepository';
import type { RoomRepository } from '../repositories/roomRepository';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

function createMockBookingRepo(): BookingRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByRoom: vi.fn().mockResolvedValue([]),
    findByRoomAndTime: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async (data) => ({ id: '1', ...data })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockRoomRepo(): RoomRepository {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'room-1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] }),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'room-1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] }),
  };
}

const validInput = {
  roomId: 'room-1',
  userId: 'user-1',
  startTime: new Date('2026-04-01T09:00:00Z'),
  endTime: new Date('2026-04-01T10:00:00Z'),
  title: 'Standup',
};

describe('BookingService', () => {
  let bookingRepo: ReturnType<typeof createMockBookingRepo>;
  let roomRepo: ReturnType<typeof createMockRoomRepo>;
  let service: BookingService;

  beforeEach(() => {
    bookingRepo = createMockBookingRepo();
    roomRepo = createMockRoomRepo();
    service = new BookingService(bookingRepo, roomRepo);
  });

  describe('create', () => {
    it('creates a booking when room exists and no conflicts', async () => {
      const booking = await service.create(validInput);
      expect(booking.title).toBe('Standup');
      expect(bookingRepo.create).toHaveBeenCalledWith(validInput);
      expect(roomRepo.findById).toHaveBeenCalledWith('room-1');
    });

    it('rejects empty title', async () => {
      await expect(service.create({ ...validInput, title: '  ' })).rejects.toThrow(ValidationError);
    });

    it('rejects start time after end time', async () => {
      await expect(
        service.create({ ...validInput, startTime: new Date('2026-04-01T11:00:00Z'), endTime: new Date('2026-04-01T10:00:00Z') }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects start time equal to end time', async () => {
      const time = new Date('2026-04-01T10:00:00Z');
      await expect(service.create({ ...validInput, startTime: time, endTime: time })).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when room does not exist', async () => {
      vi.mocked(roomRepo.findById).mockResolvedValue(null);
      await expect(service.create(validInput)).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when time slot is taken', async () => {
      vi.mocked(bookingRepo.findByRoomAndTime).mockResolvedValue([{ id: 'b-1', ...validInput }]);
      await expect(service.create(validInput)).rejects.toThrow(ConflictError);
    });
  });

  describe('getByRoom', () => {
    it('returns bookings for a room', async () => {
      const bookings = [{ id: 'b-1', ...validInput }];
      vi.mocked(bookingRepo.findByRoom).mockResolvedValue(bookings);
      const result = await service.getByRoom('room-1');
      expect(result).toEqual(bookings);
      expect(bookingRepo.findByRoom).toHaveBeenCalledWith('room-1');
    });
  });

  describe('cancel', () => {
    it('cancels an existing booking', async () => {
      vi.mocked(bookingRepo.findById).mockResolvedValue({ id: 'b-1', ...validInput });
      await service.cancel('b-1');
      expect(bookingRepo.delete).toHaveBeenCalledWith('b-1');
    });

    it('throws NotFoundError when booking does not exist', async () => {
      await expect(service.cancel('missing')).rejects.toThrow(NotFoundError);
    });
  });
});
