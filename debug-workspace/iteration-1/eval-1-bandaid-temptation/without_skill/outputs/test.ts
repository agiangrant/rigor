import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrderSummary,
  getOrdersByUser,
  processRefund,
  OrderNotFoundError,
  UserNotFoundError,
} from './fix';
import { db } from './db';

vi.mock('./db', () => ({
  db: {
    orders: {
      findById: vi.fn(),
      findByUserId: vi.fn(),
    },
    users: {
      findById: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  },
}));

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  items: [
    { productId: 'prod-1', quantity: 2, price: 50 },
    { productId: 'prod-2', quantity: 1, price: 100 },
  ],
  total: 200,
  status: 'confirmed' as const,
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  tier: 'premium' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getOrderSummary', () => {
  it('returns summary with discount for existing order and user', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);

    const result = await getOrderSummary('order-1');

    expect(result).toEqual({
      orderId: 'order-1',
      userEmail: 'test@example.com',
      items: [
        { productId: 'prod-1', subtotal: 100 },
        { productId: 'prod-2', subtotal: 100 },
      ],
      discount: 20, // 10% premium discount on 200
      finalTotal: 180,
      status: 'confirmed',
    });
  });

  it('throws OrderNotFoundError when order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(getOrderSummary('missing-order')).rejects.toThrow(
      OrderNotFoundError,
    );
    await expect(getOrderSummary('missing-order')).rejects.toThrow(
      'Order not found: missing-order',
    );
  });

  it('throws UserNotFoundError when user does not exist (the original bug)', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrderSummary('order-1')).rejects.toThrow(
      UserNotFoundError,
    );
    await expect(getOrderSummary('order-1')).rejects.toThrow(
      'User not found: user-1 (referenced by order order-1)',
    );
  });
});

describe('getOrdersByUser', () => {
  it('returns orders with discounts for existing user', async () => {
    vi.mocked(db.orders.findByUserId).mockResolvedValue([mockOrder]);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);

    const result = await getOrdersByUser('user-1');

    expect(result).toEqual([
      {
        orderId: 'order-1',
        total: 200,
        discount: 20,
        finalTotal: 180,
        status: 'confirmed',
      },
    ]);
  });

  it('throws UserNotFoundError when user does not exist', async () => {
    vi.mocked(db.orders.findByUserId).mockResolvedValue([]);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrdersByUser('missing-user')).rejects.toThrow(
      UserNotFoundError,
    );
  });
});

describe('processRefund', () => {
  it('creates refund with correct discounted amount', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);
    vi.mocked(db.refunds.create).mockResolvedValue(undefined);

    const result = await processRefund('order-1');

    expect(result).toEqual({ refundAmount: 180 });
    expect(db.refunds.create).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      amount: 180,
    });
  });

  it('throws OrderNotFoundError when order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(processRefund('missing-order')).rejects.toThrow(
      OrderNotFoundError,
    );
  });

  it('throws UserNotFoundError when user does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(processRefund('order-1')).rejects.toThrow(UserNotFoundError);
  });
});

describe('calculateDiscount (via integration)', () => {
  it('applies no discount for free tier', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue({ ...mockUser, tier: 'free' });

    const result = await getOrderSummary('order-1');

    expect(result.discount).toBe(0);
    expect(result.finalTotal).toBe(200);
  });

  it('applies 10% discount for premium tier', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue({ ...mockUser, tier: 'premium' });

    const result = await getOrderSummary('order-1');

    expect(result.discount).toBe(20);
    expect(result.finalTotal).toBe(180);
  });

  it('applies 20% discount for enterprise tier', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue({ ...mockUser, tier: 'enterprise' });

    const result = await getOrderSummary('order-1');

    expect(result.discount).toBe(40);
    expect(result.finalTotal).toBe(160);
  });
});
