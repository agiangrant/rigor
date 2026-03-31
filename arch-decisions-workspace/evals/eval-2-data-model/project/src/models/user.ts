export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  organizationId: string;
  createdAt: Date;
}
