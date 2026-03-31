export const db = {
  products: {
    findById: async (id: string) => null as any,
    findAll: async () => [],
    update: async (id: string, data: any) => ({ id, ...data }),
  },
  users: {
    findById: async (id: string) => null as any,
    update: async (id: string, data: any) => ({ id, ...data }),
  },
};
