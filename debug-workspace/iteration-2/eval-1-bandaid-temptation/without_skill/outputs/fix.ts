import { db } from './db';

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped';
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface User {
  id: string;
  email: string;
  tier: 'free' | 'premium' | 'enterprise';
}

export class NotFoundError extends Error {
  constructor(public entity: string, public entityId: string) {
    super(`${entity} not found: ${entityId}`);
    this.name = 'NotFoundError';
  }
}

async function findOrderOrThrow(orderId: string): Promise<Order> {
  const order = await db.orders.findById(orderId);
  if (!order) throw new NotFoundError('Order', orderId);
  return order;
}

async function findUserOrThrow(userId: string): Promise<User> {
  const user = await db.users.findById(userId);
  if (!user) throw new NotFoundError('User', userId);
  return user;
}

export async function getOrderSummary(orderId: string) {
  const order = await findOrderOrThrow(orderId);
  const user = await findUserOrThrow(order.userId);

  const discount = calculateDiscount(user.tier, order.total);
  const finalTotal = order.total - discount;

  return {
    orderId: order.id,
    userEmail: user.email,
    items: order.items.map(item => ({
      productId: item.productId,
      subtotal: item.quantity * item.price,
    })),
    discount,
    finalTotal,
    status: order.status,
  };
}

export async function getOrdersByUser(userId: string) {
  const orders = await db.orders.findByUserId(userId);
  const user = await findUserOrThrow(userId);

  return orders.map(order => {
    const discount = calculateDiscount(user.tier, order.total);
    return {
      orderId: order.id,
      total: order.total,
      discount,
      finalTotal: order.total - discount,
      status: order.status,
    };
  });
}

export async function processRefund(orderId: string) {
  const order = await findOrderOrThrow(orderId);
  const user = await findUserOrThrow(order.userId);

  const discount = calculateDiscount(user.tier, order.total);
  const refundAmount = order.total - discount;

  await db.refunds.create({
    orderId: order.id,
    userId: user.id,
    amount: refundAmount,
  });

  return { refundAmount };
}

function calculateDiscount(tier: string, total: number): number {
  if (tier === 'premium') return total * 0.1;
  if (tier === 'enterprise') return total * 0.2;
  return 0;
}
