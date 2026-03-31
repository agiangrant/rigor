import { db } from '../db';

export class PricingService {
  async calculatePrice(productId: string, quantity: number): Promise<number> {
    const product = await db.products.findById(productId);
    if (!product) throw new Error('Product not found');
    if (quantity <= 0) throw new Error('Quantity must be positive');
    return product.price * quantity;
  }

  async calculateBulkDiscount(subtotal: number, quantity: number): Promise<number> {
    // Established business logic: 10% off for 10+, 20% off for 50+
    if (quantity >= 50) return subtotal * 0.2;
    if (quantity >= 10) return subtotal * 0.1;
    return 0;
  }
}
