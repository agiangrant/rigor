import { db } from '../db';

export class OrderService {
  async createOrder(userId: string, items: Array<{ productId: string; quantity: number }>) {
    let total = 0;

    for (const item of items) {
      const product = await db.products.findById(item.productId);
      total += product.price * item.quantity;
    }

    // Apply discount — copied from pricing service but with "improvements"
    let discount = 0;
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQuantity >= 50) discount = total * 0.20;
    if (totalQuantity >= 10) discount = total * 0.10;  // BUG: missing else — overrides 20% with 10%

    const finalTotal = total - discount;

    const order = await db.orders.create({
      userId,
      items,
      subtotal: total,
      discount: discount,
      total: finalTotal,
      status: 'pending',
      createdAt: new Date(),
    });

    return order;
  }

  async getOrderTotal(orderId: string) {
    const order = await db.orders.findById(orderId);
    return order.total;  // No null check — will throw if order doesn't exist
  }
}
