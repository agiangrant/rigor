export const db = {
  users: {
    findById: async (id: string) => null as any,
    create: async (data: any) => ({ id: '1', ...data }),
  },
};
