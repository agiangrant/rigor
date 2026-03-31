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

interface NotificationContent {
  emailSubject: string;
  emailBody: string;
  pushText: string;
  smsText: string;
}

interface NotificationOptions {
  /** Channels to exclude even if the user has them enabled (e.g., skip SMS for promos) */
  excludeChannels?: Array<'email' | 'push' | 'sms'>;
  /** If true, guarantees at least email delivery even if all channels are disabled (for security alerts) */
  requireAtLeastOneChannel?: boolean;
}

/**
 * Central dispatcher that respects user notification preferences.
 * All notification functions should go through this instead of
 * duplicating preference-checking logic.
 */
export async function sendNotification(
  user: User,
  content: NotificationContent,
  options: NotificationOptions = {},
): Promise<void> {
  const { excludeChannels = [], requireAtLeastOneChannel = false } = options;
  let sentAny = false;

  if (user.notificationPrefs.email && !excludeChannels.includes('email')) {
    await sendEmail(user.email, content.emailSubject, content.emailBody);
    sentAny = true;
  }

  if (user.notificationPrefs.push && user.deviceToken && !excludeChannels.includes('push')) {
    await sendPush(user.deviceToken, content.pushText);
    sentAny = true;
  }

  if (user.notificationPrefs.sms && user.phone && !excludeChannels.includes('sms')) {
    await sendSMS(user.phone, content.smsText);
    sentAny = true;
  }

  // Safety net for critical notifications: if the user has disabled everything,
  // fall back to email so they still get the message.
  if (requireAtLeastOneChannel && !sentAny) {
    await sendEmail(user.email, content.emailSubject, content.emailBody);
  }
}

// Called when an order ships
export async function notifyOrderShipped(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendNotification(user, {
    emailSubject: 'Your order has shipped!',
    emailBody: `Order ${orderId} is on its way.`,
    pushText: `Order ${orderId} shipped!`,
    smsText: `Order ${orderId} has shipped.`,
  });
}

// Called when a payment fails
export async function notifyPaymentFailed(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendNotification(user, {
    emailSubject: 'Payment failed',
    emailBody: `Payment for order ${orderId} failed. Please update your payment method.`,
    pushText: `Payment failed for order ${orderId}`,
    smsText: `Payment for order ${orderId} failed.`,
  });
}

// Called when a refund is processed
export async function notifyRefundProcessed(orderId: string, amount: number) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await sendNotification(user, {
    emailSubject: 'Refund processed',
    emailBody: `$${amount} refund for order ${orderId} has been processed.`,
    pushText: `$${amount} refund processed for order ${orderId}`,
    smsText: `$${amount} refund for order ${orderId} processed.`,
  });
}

// Called when account security event occurs
export async function notifySecurityAlert(userId: string, event: string) {
  const user = await db.users.findById(userId);

  // Security alerts respect user preferences but guarantee at least email delivery
  await sendNotification(
    user,
    {
      emailSubject: 'Security Alert',
      emailBody: `Security event: ${event}`,
      pushText: `Security alert: ${event}`,
      smsText: `Security alert: ${event}`,
    },
    { requireAtLeastOneChannel: true },
  );
}

// Called for promotional campaigns
export async function notifyPromotion(userId: string, promoText: string) {
  const user = await db.users.findById(userId);

  await sendNotification(
    user,
    {
      emailSubject: 'Special Offer!',
      emailBody: promoText,
      pushText: promoText,
      smsText: promoText, // won't be sent due to excludeChannels
    },
    { excludeChannels: ['sms'] },
  );
}
