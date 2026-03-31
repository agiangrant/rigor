export const db = {
  users: { create: async (d: any) => d, findById: async (id: string) => ({ email: '' }) },
  invoices: { create: async (d: any) => d },
};
