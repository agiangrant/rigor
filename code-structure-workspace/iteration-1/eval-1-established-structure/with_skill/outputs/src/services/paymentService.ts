import { Payment } from '../models/payment';
export class PaymentService {
  static async listByUser(userId: string) { return []; }
  static async create(data: Partial<Payment>) { return data; }
}
