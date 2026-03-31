import { Order } from '../models/order';
export class OrderService {
  static async list() { return []; }
  static async create(data: Partial<Order>) { return data; }
}
