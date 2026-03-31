export const db = {
  rooms: {
    findById: async (id: string) => null as any,
    findAll: async () => [] as any[],
    create: async (data: any) => ({ id: '1', ...data }),
  },
  bookings: {
    findById: async (id: string) => null as any,
    findByRoom: async (roomId: string) => [] as any[],
    findByRoomAndTime: async (roomId: string, start: Date, end: Date) => [] as any[],
    create: async (data: any) => ({ id: '1', ...data }),
    delete: async (id: string) => {},
  },
};
