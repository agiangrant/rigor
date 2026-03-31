import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrderSummary, getOrdersByUser, processRefund, NotFoundError } from './fix';
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
  items: [{ productId: 'prod-1', quantity: 2, price: 50 }],
  total: 100,
  status: 'confirmed' as const,
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  tier: 'premium' as const,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// --- The original bug: null user causes TypeError ---

describe('getOrderSummary', () => {
  it('throws NotFoundError when user does not exist (the reported bug)', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrderSummary('order-1')).rejects.toThrow(NotFoundError);
    await expect(getOrderSummary('order-1')).rejects.toThrow('User not found: user-1');
  });

  it('throws NotFoundError when order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(getOrderSummary('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(getOrderSummary('nonexistent')).rejects.toThrow('Order not found: nonexistent');
  });

  it('returns correct summary with discount for premium user', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);

    const result = await getOrderSummary('order-1');

    expect(result).toEqual({
      orderId: 'order-1',
      userEmail: 'test@example.com',
      items: [{ productId: 'prod-1', subtotal: 100 }],
      discount: 10,
      finalTotal: 90,
      status: 'confirmed',
    });
  });

  it('returns zero discount for free tier user', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue({ ...mockUser, tier: 'free' });

    const result = await getOrderSummary('order-1');

    expect(result.discount).toBe(0);
    expect(result.finalTotal).toBe(100);
  });
});

// --- Same null-safety applies to all functions ---

describe('getOrdersByUser', () => {
  it('throws NotFoundError when user does not exist', async () => {
    vi.mocked(db.orders.findByUserId).mockResolvedValue([mockOrder]);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrdersByUser('user-1')).rejects.toThrow(NotFoundError);
    await expect(getOrdersByUser('user-1')).rejects.toThrow('User not found: user-1');
  });

  it('returns orders with discounts for existing user', async () => {
    vi.mocked(db.orders.findByUserId).mockResolvedValue([mockOrder]);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);

    const result = await getOrdersByUser('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].discount).toBe(10);
    expect(result[0].finalTotal).toBe(90);
  });
});

describe('processRefund', () => {
  it('throws NotFoundError when user does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(processRefund('order-1')).rejects.toThrow(NotFoundError);
    await expect(processRefund('order-1')).rejects.toThrow('User not found: user-1');
  });

  it('throws NotFoundError when order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(processRefund('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(processRefund('nonexistent')).rejects.toThrow('Order not found: nonexistent');
  });

  it('creates refund with correct discounted amount', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);
    vi.mocked(db.refunds.create).mockResolvedValue(undefined);

    const result = await processRefund('order-1');

    expect(result.refundAmount).toBe(90);
    expect(db.refunds.create).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      amount: 90,
    });
  });
});
