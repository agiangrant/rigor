import { describe, it, expect } from 'vitest';
import { BookingService } from '../services/bookingService';
import type { RoomRepository } from '../repositories/roomRepository';
import type { BookingRepository } from '../repositories/bookingRepository';
import type { Booking } from '../models/booking';
import type { Room } from '../models/room';

const testRoom: Room = { id: 'room-1', name: 'Alpha', capacity: 10, floor: 1, amenities: [] };

function createMockRoomRepo(overrides: Partial<RoomRepository> = {}): RoomRepository {
  return {
    findById: async () => testRoom,
    findAll: async () => [testRoom],
    create: async (data) => ({ id: '1', ...data, amenities: data.amenities ?? [] }),
    ...overrides,
  };
}

function createMockBookingRepo(overrides: Partial<BookingRepository> = {}): BookingRepository {
  return {
    findById: async () => null,
    findByRoom: async () => [],
    findByRoomAndTime: async () => [],
    create: async (data) => ({ id: 'booking-1', ...data }),
    delete: async () => {},
    ...overrides,
  };
}

function validInput() {
  return {
    roomId: 'room-1',
    userId: 'user-1',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
    title: 'Standup',
  };
}

describe('BookingService', () => {
  describe('create', () => {
    it('creates a booking with valid input', async () => {
      const roomRepo = createMockRoomRepo();
      const bookingRepo = createMockBookingRepo();
      const service = new BookingService(roomRepo, bookingRepo);

      const booking = await service.create(validInput());
      expect(booking.title).toBe('Standup');
      expect(booking.roomId).toBe('room-1');
    });

    it('throws ValidationError for empty title', async () => {
      const service = new BookingService(createMockRoomRepo(), createMockBookingRepo());
      const input = { ...validInput(), title: '' };

      await expect(service.create(input)).rejects.toThrow('Booking title is required');
    });

    it('throws ValidationError for whitespace-only title', async () => {
      const service = new BookingService(createMockRoomRepo(), createMockBookingRepo());
      const input = { ...validInput(), title: '   ' };

      await expect(service.create(input)).rejects.toThrow('Booking title is required');
    });

    it('throws ValidationError when start time equals end time', async () => {
      const service = new BookingService(createMockRoomRepo(), createMockBookingRepo());
      const time = new Date('2026-04-01T10:00:00Z');
      const input = { ...validInput(), startTime: time, endTime: time };

      await expect(service.create(input)).rejects.toThrow('Start time must be before end time');
    });

    it('throws ValidationError when start time is after end time', async () => {
      const service = new BookingService(createMockRoomRepo(), createMockBookingRepo());
      const input = {
        ...validInput(),
        startTime: new Date('2026-04-01T12:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
      };

      await expect(service.create(input)).rejects.toThrow('Start time must be before end time');
    });

    it('throws NotFoundError when room does not exist', async () => {
      const roomRepo = createMockRoomRepo({ findById: async () => null });
      const service = new BookingService(roomRepo, createMockBookingRepo());

      await expect(service.create(validInput())).rejects.toThrow('Room not found: room-1');
    });

    it('throws ConflictError when room has conflicting booking', async () => {
      const existingBooking: Booking = {
        id: 'existing-1',
        roomId: 'room-1',
        userId: 'user-2',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T11:00:00Z'),
        title: 'Existing Meeting',
      };
      const bookingRepo = createMockBookingRepo({
        findByRoomAndTime: async () => [existingBooking],
      });
      const service = new BookingService(createMockRoomRepo(), bookingRepo);

      await expect(service.create(validInput())).rejects.toThrow('Room is already booked for this time');
    });
  });

  describe('getByRoom', () => {
    it('returns bookings for a room', async () => {
      const bookings: Booking[] = [
        { id: 'b1', roomId: 'room-1', userId: 'user-1', startTime: new Date(), endTime: new Date(), title: 'A' },
      ];
      const bookingRepo = createMockBookingRepo({ findByRoom: async () => bookings });
      const service = new BookingService(createMockRoomRepo(), bookingRepo);

      const result = await service.getByRoom('room-1');
      expect(result).toEqual(bookings);
    });

    it('returns empty array when room has no bookings', async () => {
      const bookingRepo = createMockBookingRepo({ findByRoom: async () => [] });
      const service = new BookingService(createMockRoomRepo(), bookingRepo);

      const result = await service.getByRoom('room-1');
      expect(result).toEqual([]);
    });
  });

  describe('cancel', () => {
    it('cancels an existing booking', async () => {
      let deletedId: string | null = null;
      const existingBooking: Booking = {
        id: 'b1', roomId: 'room-1', userId: 'user-1',
        startTime: new Date(), endTime: new Date(), title: 'A',
      };
      const bookingRepo = createMockBookingRepo({
        findById: async () => existingBooking,
        delete: async (id) => { deletedId = id; },
      });
      const service = new BookingService(createMockRoomRepo(), bookingRepo);

      await service.cancel('b1');
      expect(deletedId).toBe('b1');
    });

    it('throws NotFoundError when booking does not exist', async () => {
      const bookingRepo = createMockBookingRepo({ findById: async () => null });
      const service = new BookingService(createMockRoomRepo(), bookingRepo);

      await expect(service.cancel('nonexistent')).rejects.toThrow('Booking not found: nonexistent');
    });
  });
});
