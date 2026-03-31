import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrderSummary,
  getOrdersByUser,
  processRefund,
  OrderNotFoundError,
  UserNotFoundError,
} from './fix';
import { db } from './db';

vi.mock('./db');

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  tier: 'premium' as const,
};

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

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------
// getOrderSummary
// ---------------------------------------------------------------------
describe('getOrderSummary', () => {
  it('returns a correct summary for an existing order and user', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(mockUser);

    const result = await getOrderSummary('order-1');

    expect(result).toEqual({
      orderId: 'order-1',
      userEmail: 'alice@example.com',
      items: [
        { productId: 'prod-1', subtotal: 100 },
        { productId: 'prod-2', subtotal: 100 },
      ],
      discount: 20, // premium = 10% of 200
      finalTotal: 180,
      status: 'confirmed',
    });
  });

  it('throws OrderNotFoundError when the order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(getOrderSummary('order-missing')).rejects.toThrow(
      OrderNotFoundError,
    );
    await expect(getOrderSummary('order-missing')).rejects.toThrow(
      'Order not found: order-missing',
    );
    // Should never attempt to look up the user
    expect(db.users.findById).not.toHaveBeenCalled();
  });

  it('throws UserNotFoundError when the user does not exist (the reported bug)', async () => {
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

// ---------------------------------------------------------------------
// getOrdersByUser
// ---------------------------------------------------------------------
describe('getOrdersByUser', () => {
  it('returns summaries for all orders belonging to a user', async () => {
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

  it('throws UserNotFoundError when the user does not exist', async () => {
    vi.mocked(db.orders.findByUserId).mockResolvedValue([]);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(getOrdersByUser('user-gone')).rejects.toThrow(
      UserNotFoundError,
    );
    await expect(getOrdersByUser('user-gone')).rejects.toThrow(
      'User not found: user-gone',
    );
  });
});

// ---------------------------------------------------------------------
// processRefund
// ---------------------------------------------------------------------
describe('processRefund', () => {
  it('creates a refund with the correct discounted amount', async () => {
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

  it('throws OrderNotFoundError when the order does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(null);

    await expect(processRefund('order-missing')).rejects.toThrow(
      OrderNotFoundError,
    );
    expect(db.users.findById).not.toHaveBeenCalled();
    expect(db.refunds.create).not.toHaveBeenCalled();
  });

  it('throws UserNotFoundError when the user does not exist', async () => {
    vi.mocked(db.orders.findById).mockResolvedValue(mockOrder);
    vi.mocked(db.users.findById).mockResolvedValue(null);

    await expect(processRefund('order-1')).rejects.toThrow(
      UserNotFoundError,
    );
    // Must not create a refund when the user is missing
    expect(db.refunds.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------
// calculateDiscount (tested indirectly through public API)
// ---------------------------------------------------------------------
describe('discount calculation via getOrderSummary', () => {
  it('applies 0% discount for free tier', async () => {
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
