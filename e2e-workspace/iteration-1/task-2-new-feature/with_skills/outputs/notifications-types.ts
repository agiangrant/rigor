/**
 * Notification system types.
 * These types are independent of the coupling strategy (direct injection vs events)
 * and the channel implementation (email, Slack, etc.).
 *
 * Intended location: src/notifications/types.ts
 */

export type NotificationType = 'booking.created' | 'booking.cancelled';

export interface Recipient {
  id: string;
  email: string;
  name: string;
  slackId?: string; // Future: Slack channel support
}

export interface NotificationMessage {
  type: NotificationType;
  recipient: Recipient;
  subject: string;
  body: string;
}

/**
 * A notification channel is a transport mechanism (email, Slack, etc.).
 * Each channel knows how to deliver a message through its medium.
 */
export interface NotificationChannel {
  readonly name: string;
  send(message: NotificationMessage): Promise<void>;
}
