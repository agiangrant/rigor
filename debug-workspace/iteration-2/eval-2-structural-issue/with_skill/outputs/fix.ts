import { db } from './db';
import { sendEmail } from './emailClient';
import { sendPush } from './pushClient';
import { sendSMS } from './smsClient';

// --- Types ---

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

type NotificationPriority = 'standard' | 'critical';

interface NotificationMessage {
  subject: string;
  body: string;
  shortText: string; // For SMS and push
}

// --- Channel Routing ---

/**
 * Central dispatcher: sends a notification to a user through their enabled channels.
 *
 * All channel routing goes through this function. Individual notification functions
 * compose messages but never call send* directly.
 *
 * Priority behavior:
 * - 'standard': sends only to channels the user has enabled
 * - 'critical': sends to all channels the user has enabled, and ALWAYS sends email
 *   as a guaranteed fallback (email has no per-message cost and every user has one)
 *
 * Critical notifications still respect explicit opt-outs for SMS and push.
 * A user who disables SMS has made a deliberate choice -- we don't override it,
 * even for security alerts. Email is the guaranteed delivery channel.
 */
export async function sendToUser(
  user: User,
  message: NotificationMessage,
  priority: NotificationPriority = 'standard',
): Promise<void> {
  const prefs = user.notificationPrefs;

  // Email: send if user enabled it, OR if priority is critical (guaranteed fallback)
  if (prefs.email || priority === 'critical') {
    await sendEmail(user.email, message.subject, message.body);
  }

  // Push: always respect user preference
  if (prefs.push && user.deviceToken) {
    await sendPush(user.deviceToken, message.shortText);
  }

  // SMS: always respect user preference
  if (prefs.sms && user.phone) {
    await sendSMS(user.phone, message.shortText);
  }
}

// --- Notification Functions ---

export async function notifyOrderShipped(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendToUser(user, {
    subject: 'Your order has shipped!',
    body: `Order ${orderId} is on its way.`,
    shortText: `Order ${orderId} shipped!`,
  });
}

export async function notifyPaymentFailed(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendToUser(user, {
    subject: 'Payment failed',
    body: `Payment for order ${orderId} failed. Please update your payment method.`,
    shortText: `Payment failed for order ${orderId}`,
  });
}

export async function notifyRefundProcessed(orderId: string, amount: number) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendToUser(user, {
    subject: 'Refund processed',
    body: `$${amount} refund for order ${orderId} has been processed.`,
    shortText: `$${amount} refund processed for order ${orderId}`,
  });
}

export async function notifySecurityAlert(userId: string, event: string) {
  const user = await db.users.findById(userId);

  await sendToUser(
    user,
    {
      subject: 'Security Alert',
      body: `Security event: ${event}`,
      shortText: `Security alert: ${event}`,
    },
    'critical',
  );
}

export async function notifyPromotion(userId: string, promoText: string) {
  const user = await db.users.findById(userId);

  await sendToUser(user, {
    subject: 'Special Offer!',
    body: promoText,
    shortText: promoText,
  });
}
