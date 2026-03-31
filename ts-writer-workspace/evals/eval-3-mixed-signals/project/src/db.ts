export const db = {
  users: {
    findById: async (id: string) => null as any,
    findByEmail: async (email: string) => null as any,
    findAll: async () => [] as any[],
    create: async (data: any) => ({ id: '1', ...data }),
  },
  comments: {
    create: async (data: any) => ({ id: '1', ...data }),
    findByResource: async (resourceId: string) => [] as any[],
    findById: async (id: string) => null as any,
    update: async (id: string, data: any) => ({ id, ...data }),
    delete: async (id: string) => {},
  },
};
