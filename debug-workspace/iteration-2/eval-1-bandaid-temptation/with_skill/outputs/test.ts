import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrderSummary,
  getOrdersByUser,
  processRefund,
  OrderServiceError,
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
  id: 'order-abc123',
  userId: 'user-1',
  items: [{ productId: 'prod-1', quantity: 2, price: 50 }],
  total: 100,
  status: 'confirmed' as const,
};

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  tier: 'premium' as const,
};

beforeEach(() => {
  vi.resetAllMocks();
});

// -------------------------------------------------------------------
// Bug reproduction: user missing from database (the reported crash)
// These tests MUST fail against the original code and pass against fix.ts
// -------------------------------------------------------------------

describe('getOrderSummary — missing user (reported bug)', () => {
  it('throws OrderServiceError when the user does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrderSummary('order-abc123')).rejects.toThrow(
      OrderServiceError,
    );
    await expect(getOrderSummary('order-abc123')).rejects.toThrow(
      /User user-1 not found for order order-abc123/,
    );
  });

  it('throws OrderServiceError when the order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(getOrderSummary('order-nope')).rejects.toThrow(
      OrderServiceError,
    );
    await expect(getOrderSummary('order-nope')).rejects.toThrow(
      /Order order-nope not found/,
    );
  });
});

describe('getOrdersByUser — missing user', () => {
  it('throws OrderServiceError when the user does not exist', async () => {
    vi.mocked(db.orders.findByUserId).mockResolvedValue([mockOrder]);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrdersByUser('user-1')).rejects.toThrow(
      OrderServiceError,
    );
    await expect(getOrdersByUser('user-1')).rejects.toThrow(
      /User user-1 not found/,
    );
  });
});

describe('processRefund — missing user', () => {
  it('throws OrderServiceError when the user does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(processRefund('order-abc123')).rejects.toThrow(
      OrderServiceError,
    );
    await expect(processRefund('order-abc123')).rejects.toThrow(
      /User user-1 not found for refund on order order-abc123/,
    );
  });

  it('throws OrderServiceError when the order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(processRefund('order-missing')).rejects.toThrow(
      OrderServiceError,
    );
    await expect(processRefund('order-missing')).rejects.toThrow(
      /Order order-missing not found for refund/,
    );
  });
});

// -------------------------------------------------------------------
// Happy-path regression: existing behavior still works
// -------------------------------------------------------------------

describe('getOrderSummary — happy path', () => {
  it('returns correct summary with premium discount', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);

    const result = await getOrderSummary('order-abc123');

    expect(result).toEqual({
      orderId: 'order-abc123',
      userEmail: 'alice@example.com',
      items: [{ productId: 'prod-1', subtotal: 100 }],
      discount: 10,
      finalTotal: 90,
      status: 'confirmed',
    });
  });

  it('applies no discount for free tier', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue({
      ...mockUser,
      tier: 'free',
    });

    const result = await getOrderSummary('order-abc123');
    expect(result.discount).toBe(0);
    expect(result.finalTotal).toBe(100);
  });

  it('applies 20% discount for enterprise tier', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue({
      ...mockUser,
      tier: 'enterprise',
    });

    const result = await getOrderSummary('order-abc123');
    expect(result.discount).toBe(20);
    expect(result.finalTotal).toBe(80);
  });
});

describe('processRefund — happy path', () => {
  it('creates refund with correct discounted amount', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);
    vi.mocked(db.refunds.create).mockResolvedValue(undefined);

    const result = await processRefund('order-abc123');

    expect(result).toEqual({ refundAmount: 90 });
    expect(db.refunds.create).toHaveBeenCalledWith({
      orderId: 'order-abc123',
      userId: 'user-1',
      amount: 90,
    });
  });
});
