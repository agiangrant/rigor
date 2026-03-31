export type NotificationType = 'booking_created' | 'booking_cancelled';

export interface Notification {
  type: NotificationType;
  recipientEmail: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  readonly name: string;
  send(notification: Notification): Promise<void>;
}
