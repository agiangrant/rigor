export const taskRepo = {
  findByUser: async (userId: string) => [],
  create: async (data: any) => ({ id: '1', ...data }),
  update: async (id: string, data: any) => ({ id, ...data }),
};
