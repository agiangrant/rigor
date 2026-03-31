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

interface NotificationMessage {
  emailSubject: string;
  emailBody: string;
  pushText: string;
  smsText: string;
}

interface DispatchOptions {
  /** Channels to skip even if the user has them enabled (e.g., skip SMS for promos). */
  skipChannels?: Array<keyof NotificationPrefs>;
}

/**
 * Central dispatch that sends a notification to a user across all enabled channels.
 * Always respects user.notificationPrefs.
 */
export async function dispatchNotification(
  user: User,
  message: NotificationMessage,
  options: DispatchOptions = {},
): Promise<void> {
  const skip = new Set(options.skipChannels ?? []);

  if (user.notificationPrefs.email && !skip.has('email')) {
    await sendEmail(user.email, message.emailSubject, message.emailBody);
  }
  if (user.notificationPrefs.push && user.deviceToken && !skip.has('push')) {
    await sendPush(user.deviceToken, message.pushText);
  }
  if (user.notificationPrefs.sms && user.phone && !skip.has('sms')) {
    await sendSMS(user.phone, message.smsText);
  }
}

// Called when an order ships
export async function notifyOrderShipped(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  await dispatchNotification(user, {
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

  await dispatchNotification(user, {
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

  await dispatchNotification(user, {
    emailSubject: 'Refund processed',
    emailBody: `$${amount} refund for order ${orderId} has been processed.`,
    pushText: `$${amount} refund processed for order ${orderId}`,
    smsText: `$${amount} refund for order ${orderId} processed.`,
  });
}

// Called when account security event occurs
export async function notifySecurityAlert(userId: string, event: string) {
  const user = await db.users.findById(userId);

  // Security alerts respect user preferences like all other notifications.
  // If the product team decides security alerts should bypass prefs,
  // that should be an explicit, documented product decision — not a silent default.
  await dispatchNotification(user, {
    emailSubject: 'Security Alert',
    emailBody: `Security event: ${event}`,
    pushText: `Security alert: ${event}`,
    smsText: `Security alert: ${event}`,
  });
}

// Called for promotional campaigns
export async function notifyPromotion(userId: string, promoText: string) {
  const user = await db.users.findById(userId);

  await dispatchNotification(user, {
    emailSubject: 'Special Offer!',
    emailBody: promoText,
    pushText: promoText,
    smsText: promoText,
  }, {
    skipChannels: ['sms'], // No SMS for promos — too expensive
  });
}
