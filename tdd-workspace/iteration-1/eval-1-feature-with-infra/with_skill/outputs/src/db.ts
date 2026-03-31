export const db = {
  users: {
    findById: async (id: string) => null as any,
    findByEmail: async (email: string) => null as any,
    create: async (data: any) => ({ id: '1', ...data }),
  },
  invitations: {
    create: async (data: any) => ({ id: '1', ...data }),
    findByEmail: async (email: string) => [] as any[],
    findByToken: async (token: string) => null as any,
    update: async (id: string, data: any) => ({ id, ...data }),
  },
};
