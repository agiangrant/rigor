import { db } from '../infrastructure/db';
import { emailService } from '../services/emailService';

export class OrderService {
  async createOrder(userId: string, items: any[]) {
    const order = await db.query(
      'INSERT INTO orders (user_id, items, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, JSON.stringify(items), 'pending']
    );

    // TODO: These should not block the API response
    // Currently takes 2-3 seconds and users are complaining about slow checkout
    await emailService.sendOrderConfirmation(order.rows[0]);
    await this.generateInvoicePdf(order.rows[0]);
    await this.updateInventory(order.rows[0]);
    await this.notifyWarehouse(order.rows[0]);

    return order.rows[0];
  }

  private async generateInvoicePdf(order: any) {
    // Slow — calls external PDF service, ~800ms
  }

  private async updateInventory(order: any) {
    // Updates inventory counts, ~200ms
  }

  private async notifyWarehouse(order: any) {
    // Sends webhook to warehouse system, ~500ms
  }
}
