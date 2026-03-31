import type { Booking } from './services/bookingService';

// In-memory store for stub implementation
const bookingsStore: Booking[] = [];

export const db = {
  rooms: {
    findById: async (id: string) => null as any,
    findAll: async () => [] as any[],
    create: async (data: any) => ({ id: '1', ...data }),
  },
  bookings: {
    findById: async (id: string) => null as any,
    findByRoom: async (roomId: string) => [] as any[],
    // Fixed: uses overlap logic instead of exact match.
    // Two intervals [startA, endA) and [startB, endB) overlap when startA < endB && startB < endA.
    findByRoomAndTime: async (roomId: string, start: Date, end: Date): Promise<Booking[]> => {
      return bookingsStore.filter(
        (b) => b.roomId === roomId && b.startTime < end && start < b.endTime,
      );
    },
    findByRecurrenceGroup: async (groupId: string): Promise<Booking[]> => {
      return bookingsStore.filter((b) => b.recurrenceGroupId === groupId);
    },
    create: async (data: any) => ({ id: '1', ...data }),
    delete: async (id: string) => {},
  },
};
