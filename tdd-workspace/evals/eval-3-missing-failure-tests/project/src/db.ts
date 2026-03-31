export const db = {
  accounts: {
    findById: async (id: string) => null as any,
    update: async (id: string, data: any) => ({ id, ...data }),
  },
  transfers: {
    create: async (data: any) => ({ id: '1', ...data }),
  },
};
