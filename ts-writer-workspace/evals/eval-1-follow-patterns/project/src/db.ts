export const db = {
  users: {
    findById: async (id: string) => null as any,
    findByEmail: async (email: string) => null as any,
    findAll: async () => [] as any[],
    create: async (data: any) => ({ id: '1', ...data }),
  },
  projects: {
    findById: async (id: string) => null as any,
    findByUserId: async (userId: string) => [] as any[],
    create: async (data: any) => ({ id: '1', ...data }),
    update: async (id: string, data: any) => ({ id, ...data }),
    delete: async (id: string) => {},
  },
};
