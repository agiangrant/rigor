import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the external dependencies
vi.mock('./db', () => ({
  db: {
    users: {
      findById: vi.fn(),
    },
    orders: {
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
  dispatchNotification,
  notifySecurityAlert,
  notifyOrderShipped,
  notifyPromotion,
} from './fix';

function makeUser(overrides: Partial<{
  notificationPrefs: { email: boolean; push: boolean; sms: boolean };
  phone: string | undefined;
  deviceToken: string | undefined;
}> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: '+15551234567',
    deviceToken: 'device-token-abc',
    notificationPrefs: { email: true, push: true, sms: true },
    ...overrides,
  };
}

const sampleMessage = {
  emailSubject: 'Test Subject',
  emailBody: 'Test body',
  pushText: 'Test push',
  smsText: 'Test sms',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- dispatchNotification unit tests ----------

describe('dispatchNotification', () => {
  it('sends to all channels when all prefs are enabled', async () => {
    const user = makeUser();
    await dispatchNotification(user, sampleMessage);

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
  });

  it('does not send SMS when user has sms disabled', async () => {
    const user = makeUser({ notificationPrefs: { email: true, push: true, sms: false } });
    await dispatchNotification(user, sampleMessage);

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  it('does not send push when user has no deviceToken', async () => {
    const user = makeUser({ deviceToken: undefined });
    await dispatchNotification(user, sampleMessage);

    expect(sendPush).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
  });

  it('does not send SMS when user has no phone', async () => {
    const user = makeUser({ phone: undefined });
    await dispatchNotification(user, sampleMessage);

    expect(sendSMS).not.toHaveBeenCalled();
  });

  it('respects skipChannels option', async () => {
    const user = makeUser();
    await dispatchNotification(user, sampleMessage, { skipChannels: ['sms'] });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  it('sends nothing when all prefs are disabled', async () => {
    const user = makeUser({ notificationPrefs: { email: false, push: false, sms: false } });
    await dispatchNotification(user, sampleMessage);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });
});

// ---------- Bug fix verification: security alerts respect prefs ----------

describe('notifySecurityAlert', () => {
  it('does NOT send SMS when user has sms disabled', async () => {
    const user = makeUser({ notificationPrefs: { email: true, push: true, sms: false } });
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifySecurityAlert('user-1', 'suspicious login');

    expect(sendSMS).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledOnce();
  });

  it('sends to all channels when all prefs are enabled', async () => {
    const user = makeUser();
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifySecurityAlert('user-1', 'password changed');

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
  });
});

// ---------- Regression: existing behavior preserved ----------

describe('notifyOrderShipped', () => {
  it('respects user prefs', async () => {
    const user = makeUser({ notificationPrefs: { email: true, push: false, sms: false } });
    (db.orders.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1' });
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifyOrderShipped('order-1');

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });
});

describe('notifyPromotion', () => {
  it('never sends SMS even when user has sms enabled', async () => {
    const user = makeUser();
    (db.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);

    await notifyPromotion('user-1', 'Big sale!');

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledOnce();
    expect(sendSMS).not.toHaveBeenCalled();
  });
});
