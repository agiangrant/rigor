export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface ApiResponse<T> {
  data: T;
  meta?: { page: number; total: number };
}
