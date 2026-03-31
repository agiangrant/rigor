export const db = {
  products: { findById: async (id: string) => null as any },
  orders: {
    create: async (data: any) => ({ id: '1', ...data }),
    findById: async (id: string) => null as any,
  },
};
