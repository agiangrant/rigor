export const db = {
  users: {
    findByEmail: async (email: string) => null as any,
    findById: async (id: string) => null as any,
    create: async (data: any) => ({ id: '1', ...data }),
    update: async (id: string, data: any) => ({ id, ...data }),
    delete: async (id: string) => {},
  },
  sessions: {
    create: async (data: any) => data,
    findByToken: async (token: string) => null as any,
    deleteByToken: async (token: string) => {},
  },
  passwordResets: {
    create: async (data: any) => data,
    findByToken: async (token: string) => null as any,
    delete: async (id: string) => {},
  },
};
