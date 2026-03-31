import type { Booking } from './models/booking';
import type { Room } from './models/room';

export const db = {
  rooms: {
    findById: async (id: string): Promise<Room | null> => null as any,
    findAll: async (): Promise<Room[]> => [] as any[],
    create: async (data: Omit<Room, 'id'>): Promise<Room> => ({ id: '1', ...data }),
  },
  bookings: {
    findById: async (id: string): Promise<Booking | null> => null as any,
    findByRoom: async (roomId: string): Promise<Booking[]> => [] as any[],
    /**
     * Find bookings that overlap with the given time range for a room.
     * Two ranges overlap when startA < endB AND startB < endA.
     */
    findOverlapping: async (roomId: string, start: Date, end: Date): Promise<Booking[]> => [] as any[],
    create: async (data: Omit<Booking, 'id'>): Promise<Booking> => ({ id: '1', ...data }),
    delete: async (id: string): Promise<void> => {},
  },
};
