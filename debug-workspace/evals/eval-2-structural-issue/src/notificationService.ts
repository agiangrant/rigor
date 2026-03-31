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

// Called when an order ships
export async function notifyOrderShipped(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  if (user.notificationPrefs.email) {
    await sendEmail(user.email, 'Your order has shipped!', `Order ${orderId} is on its way.`);
  }
  if (user.notificationPrefs.push && user.deviceToken) {
    await sendPush(user.deviceToken, `Order ${orderId} shipped!`);
  }
  if (user.notificationPrefs.sms && user.phone) {
    await sendSMS(user.phone, `Order ${orderId} has shipped.`);
  }
}

// Called when a payment fails
export async function notifyPaymentFailed(orderId: string) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  if (user.notificationPrefs.email) {
    await sendEmail(user.email, 'Payment failed', `Payment for order ${orderId} failed. Please update your payment method.`);
  }
  if (user.notificationPrefs.push && user.deviceToken) {
    await sendPush(user.deviceToken, `Payment failed for order ${orderId}`);
  }
  if (user.notificationPrefs.sms && user.phone) {
    await sendSMS(user.phone, `Payment for order ${orderId} failed.`);
  }
}

// Called when a refund is processed
export async function notifyRefundProcessed(orderId: string, amount: number) {
  const order = await db.orders.findById(orderId);
  const user = await db.users.findById(order.userId);

  if (user.notificationPrefs.email) {
    await sendEmail(user.email, 'Refund processed', `$${amount} refund for order ${orderId} has been processed.`);
  }
  if (user.notificationPrefs.push && user.deviceToken) {
    await sendPush(user.deviceToken, `$${amount} refund processed for order ${orderId}`);
  }
  if (user.notificationPrefs.sms && user.phone) {
    await sendSMS(user.phone, `$${amount} refund for order ${orderId} processed.`);
  }
}

// Called when account security event occurs
export async function notifySecurityAlert(userId: string, event: string) {
  const user = await db.users.findById(userId);

  // Security alerts always go to all channels regardless of prefs
  await sendEmail(user.email, 'Security Alert', `Security event: ${event}`);
  if (user.deviceToken) {
    await sendPush(user.deviceToken, `Security alert: ${event}`);
  }
  if (user.phone) {
    await sendSMS(user.phone, `Security alert: ${event}`);
  }
}

// Called for promotional campaigns
export async function notifyPromotion(userId: string, promoText: string) {
  const user = await db.users.findById(userId);

  if (user.notificationPrefs.email) {
    await sendEmail(user.email, 'Special Offer!', promoText);
  }
  if (user.notificationPrefs.push && user.deviceToken) {
    await sendPush(user.deviceToken, promoText);
  }
  // No SMS for promos — too expensive
}
