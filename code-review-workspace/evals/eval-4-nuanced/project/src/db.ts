export const db = {
  users: {
    findById: async (id: string) => null as any,
    update: async (id: string, data: any) => ({ id, ...data }),
    findByOrganization: async (orgId: string) => [] as any[],
  },
  notificationLog: {
    create: async (data: any) => ({ id: '1', ...data }),
    findByUser: async (userId: string, limit: number) => [] as any[],
  },
};
