import { Payment } from '../models/payment';
export class PaymentService {
  static async create(data: Partial<Payment>) { return data; }
  static async listByUser(userId: string) { return []; }
}
