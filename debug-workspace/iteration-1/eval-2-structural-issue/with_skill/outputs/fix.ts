import { db } from './db';
import { sendEmail } from './emailClient';
import { sendPush } from './pushClient';
import { sendSMS } from './smsClient';

interface NotificationPrefs {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface User {
  id: string;
  email: string;
  phone?: string;
  deviceToken?: string;
  notificationPrefs: NotificationPrefs;
}

interface ChannelMessages {
  email?: { subject: string; body: string };
  push?: { message: string };
  sms?: { message: string };
}

interface ChannelOverrides {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
}

/**
 * Core dispatch function. Sends notifications on requested channels,
 * respecting user preferences unless explicitly overridden per-channel.
 *
 * Override semantics: if overrides.email is true, send email regardless of
 * user prefs (but user.email must still exist). SMS overrides are intentionally
 * NOT used by any current caller -- SMS costs the user money, so we always
 * respect their opt-out. This is a deliberate product decision.
 */
async function sendNotification(
  user: User,
  channels: ChannelMessages,
  overrides: ChannelOverrides = {},
): Promise<void> {
  if (channels.email) {
    const shouldSend = overrides.email || user.notificationPrefs.email;
    if (shouldSend) {
      await sendEmail(user.email, channels.email.subject, channels.email.body);
    }
  }

  if (channels.push) {
    const shouldSend = overrides.push || user.notificationPrefs.push;
    if (shouldSend && user.deviceToken) {
      await sendPush(user.deviceToken, channels.push.message);
    }
  }

  if (channels.sms) {
    const shouldSend = overrides.sms || user.notificationPrefs.sms;
    if (shouldSend && user.phone) {
      await sendSMS(user.phone, channels.sms.message);
    }
  }
}

// Called when an order ships
export async function notifyOrderShipped(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendNotification(user, {
    email: { subject: 'Your order has shipped!', body: `Order ${orderId} is on its way.` },
    push: { message: `Order ${orderId} shipped!` },
    sms: { message: `Order ${orderId} has shipped.` },
  });
}

// Called when a payment fails
export async function notifyPaymentFailed(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendNotification(user, {
    email: { subject: 'Payment failed', body: `Payment for order ${orderId} failed. Please update your payment method.` },
    push: { message: `Payment failed for order ${orderId}` },
    sms: { message: `Payment for order ${orderId} failed.` },
  });
}

// Called when a refund is processed
export async function notifyRefundProcessed(orderId: string, amount: number) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendNotification(user, {
    email: { subject: 'Refund processed', body: `$${amount} refund for order ${orderId} has been processed.` },
    push: { message: `$${amount} refund processed for order ${orderId}` },
    sms: { message: `$${amount} refund for order ${orderId} processed.` },
  });
}

// Called when account security event occurs
// Policy: security alerts override email and push prefs (free channels),
// but RESPECT SMS prefs because SMS costs the user money.
export async function notifySecurityAlert(userId: string, event: string) {
  const user = await db.users.findById(userId);

  await sendNotification(
    user,
    {
      email: { subject: 'Security Alert', body: `Security event: ${event}` },
      push: { message: `Security alert: ${event}` },
      sms: { message: `Security alert: ${event}` },
    },
    { email: true, push: true },  // Override email & push, but not SMS
  );
}

// Called for promotional campaigns
// Policy: no SMS for promos (too expensive on our end)
export async function notifyPromotion(userId: string, promoText: string) {
  const user = await db.users.findById(userId);

  await sendNotification(user, {
    email: { subject: 'Special Offer!', body: promoText },
    push: { message: promoText },
    // SMS intentionally omitted -- too expensive for promotional use
  });
}

export { sendNotification, User, NotificationPrefs, ChannelMessages, ChannelOverrides };
