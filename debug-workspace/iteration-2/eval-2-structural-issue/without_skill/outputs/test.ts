import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('./db', () => ({
  db: {
    orders: {
      findById: vi.fn(),
    },
    users: {
      findById: vi.fn(),
    },
  },
}));

vi.mock('./emailClient', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./pushClient', () => ({ sendPush: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./smsClient', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }));

import { db } from './db';
import { sendEmail } from './emailClient';
import { sendPush } from './pushClient';
import { sendSMS } from './smsClient';
import {
  sendNotification,
  notifySecurityAlert,
  notifyOrderShipped,
  notifyPromotion,
} from './fix';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: '+15551234567',
    deviceToken: 'device-abc',
    notificationPrefs: { email: true, push: true, sms: true },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendNotification', () => {
  const content = {
    emailSubject: 'Subject',
    emailBody: 'Body',
    pushText: 'Push',
    smsText: 'SMS',
  };

  it('sends to all enabled channels', async () => {
    const user = makeUser();
    await sendNotification(user, content);

    expect(sendEmail).toHaveBeenCalledWith('user@example.com', 'Subject', 'Body');
    expect(sendPush).toHaveBeenCalledWith('device-abc', 'Push');
    expect(sendSMS).toHaveBeenCalledWith('+15551234567', 'SMS');
  });

  it('skips channels the user has disabled', async () => {
    const user = makeUser({
      notificationPrefs: { email: true, push: false, sms: false },
    });
    await sendNotification(user, content);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  it('skips SMS when user has no phone number even if sms pref is true', async () => {
    const user = makeUser({ phone: undefined });
    await sendNotification(user, content);

    expect(sendSMS).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(sendPush).toHaveBeenCalled();
  });

  it('skips push when user has no device token even if push pref is true', async () => {
    const user = makeUser({ deviceToken: undefined });
    await sendNotification(user, content);

    expect(sendPush).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(sendSMS).toHaveBeenCalled();
  });

  it('respects excludeChannels option', async () => {
    const user = makeUser();
    await sendNotification(user, content, { excludeChannels: ['sms'] });

    expect(sendSMS).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(sendPush).toHaveBeenCalled();
  });

  it('falls back to email when requireAtLeastOneChannel is true and all channels disabled', async () => {
    const user = makeUser({
      notificationPrefs: { email: false, push: false, sms: false },
    });
    await sendNotification(user, content, { requireAtLeastOneChannel: true });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith('user@example.com', 'Subject', 'Body');
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  it('does not fall back to email when requireAtLeastOneChannel is false and all channels disabled', async () => {
    const user = makeUser({
      notificationPrefs: { email: false, push: false, sms: false },
    });
    await sendNotification(user, content);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });
});

describe('notifySecurityAlert — the reported bug', () => {
  it('does NOT send SMS when user has disabled SMS', async () => {
    const user = makeUser({
      notificationPrefs: { email: true, push: true, sms: false },
    });
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifySecurityAlert('user-1', 'new login from unknown device');

    expect(sendSMS).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(sendPush).toHaveBeenCalled();
  });

  it('still sends email fallback if user has disabled all channels', async () => {
    const user = makeUser({
      notificationPrefs: { email: false, push: false, sms: false },
    });
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifySecurityAlert('user-1', 'password changed');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendSMS).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
  });
});

describe('notifyOrderShipped', () => {
  it('respects user preferences', async () => {
    const user = makeUser({
      notificationPrefs: { email: true, push: false, sms: false },
    });
    (db.orders.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1' });
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifyOrderShipped('order-123');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });
});

describe('notifyPromotion', () => {
  it('never sends SMS for promotions, even if user has SMS enabled', async () => {
    const user = makeUser({
      notificationPrefs: { email: true, push: true, sms: true },
    });
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifyPromotion('user-1', 'Buy one get one free!');

    expect(sendSMS).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(sendPush).toHaveBeenCalled();
  });
});
