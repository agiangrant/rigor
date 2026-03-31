/**
 * Regression tests for the notification service.
 *
 * These tests mock the database and all send clients, then verify that
 * channel dispatch respects user preferences and per-notification-type policy.
 *
 * The primary regression target: users with sms:false must NOT receive SMS
 * on security alerts (the original bug).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- Mocks ----

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
const mockSendPush = vi.fn().mockResolvedValue(undefined);
const mockSendSMS = vi.fn().mockResolvedValue(undefined);

vi.mock('./emailClient', () => ({ sendEmail: mockSendEmail }));
vi.mock('./pushClient', () => ({ sendPush: mockSendPush }));
vi.mock('./smsClient', () => ({ sendSMS: mockSendSMS }));

const mockUsers: Record<string, any> = {};
const mockOrders: Record<string, any> = {};

vi.mock('./db', () => ({
  db: {
    users: { findById: vi.fn((id: string) => Promise.resolve(mockUsers[id])) },
    orders: { findById: vi.fn((id: string) => Promise.resolve(mockOrders[id])) },
  },
}));

import {
  notifyOrderShipped,
  notifyPaymentFailed,
  notifyRefundProcessed,
  notifySecurityAlert,
  notifyPromotion,
} from './fix';

// ---- Helpers ----

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: '+15551234567',
    deviceToken: 'device-abc',
    notificationPrefs: { email: true, push: true, sms: true },
    ...overrides,
  };
}

// ---- Tests ----

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default user and order
    mockUsers['user-1'] = makeUser();
    mockOrders['order-1'] = { id: 'order-1', userId: 'user-1' };
  });

  // ============================================================
  // PRIMARY REGRESSION: The original bug
  // ============================================================

  describe('security alerts respect SMS opt-out (original bug)', () => {
    it('does NOT send SMS when user has sms:false', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: true, push: true, sms: false },
      });

      await notifySecurityAlert('user-1', 'suspicious login');

      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('DOES send SMS when user has sms:true', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: true, push: true, sms: true },
      });

      await notifySecurityAlert('user-1', 'suspicious login');

      expect(mockSendSMS).toHaveBeenCalledWith('+15551234567', 'Security alert: suspicious login');
    });

    it('does NOT send SMS when user has no phone number even with sms:true', async () => {
      mockUsers['user-1'] = makeUser({
        phone: undefined,
        notificationPrefs: { email: true, push: true, sms: true },
      });

      await notifySecurityAlert('user-1', 'suspicious login');

      expect(mockSendSMS).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Security alert override behavior for free channels
  // ============================================================

  describe('security alerts override email and push prefs', () => {
    it('sends email even when user has email:false', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: false, push: false, sms: false },
      });

      await notifySecurityAlert('user-1', 'password changed');

      expect(mockSendEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Security Alert',
        'Security event: password changed',
      );
    });

    it('sends push even when user has push:false', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: false, push: false, sms: false },
      });

      await notifySecurityAlert('user-1', 'password changed');

      expect(mockSendPush).toHaveBeenCalledWith('device-abc', 'Security alert: password changed');
    });

    it('does NOT send push when user has no deviceToken', async () => {
      mockUsers['user-1'] = makeUser({
        deviceToken: undefined,
        notificationPrefs: { email: false, push: false, sms: false },
      });

      await notifySecurityAlert('user-1', 'password changed');

      expect(mockSendPush).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Standard notification types respect all prefs
  // ============================================================

  describe('order shipped respects all prefs', () => {
    it('sends on all channels when all prefs enabled', async () => {
      await notifyOrderShipped('order-1');

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendPush).toHaveBeenCalledTimes(1);
      expect(mockSendSMS).toHaveBeenCalledTimes(1);
    });

    it('sends nothing when all prefs disabled', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: false, push: false, sms: false },
      });

      await notifyOrderShipped('order-1');

      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendPush).not.toHaveBeenCalled();
      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('does not send SMS when sms:false', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: true, push: true, sms: false },
      });

      await notifyOrderShipped('order-1');

      expect(mockSendSMS).not.toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendPush).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Promotions never send SMS
  // ============================================================

  describe('promotions never send SMS', () => {
    it('does not send SMS even when sms:true', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: true, push: true, sms: true },
      });

      await notifyPromotion('user-1', 'Big sale!');

      expect(mockSendSMS).not.toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendPush).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Payment failed and refund processed (pref-respecting)
  // ============================================================

  describe('payment failed respects prefs', () => {
    it('does not send SMS when sms:false', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: true, push: true, sms: false },
      });

      await notifyPaymentFailed('order-1');

      expect(mockSendSMS).not.toHaveBeenCalled();
    });
  });

  describe('refund processed respects prefs', () => {
    it('does not send SMS when sms:false', async () => {
      mockUsers['user-1'] = makeUser({
        notificationPrefs: { email: true, push: true, sms: false },
      });

      await notifyRefundProcessed('order-1', 29.99);

      expect(mockSendSMS).not.toHaveBeenCalled();
    });
  });
});
