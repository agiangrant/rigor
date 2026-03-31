/**
 * Email notification channel.
 *
 * Intended location: src/notifications/channels/emailChannel.ts
 *
 * This is a stub implementation. The actual email sending mechanism
 * (SMTP, SendGrid, SES, etc.) is a separate infrastructure decision.
 * The interface is what matters — implementations are swappable.
 */

import type { NotificationChannel, NotificationMessage } from '../types';

export interface EmailTransport {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export class EmailChannel implements NotificationChannel {
  readonly name = 'email';

  constructor(private readonly transport: EmailTransport) {}

  async send(message: NotificationMessage): Promise<void> {
    if (!message.recipient.email) {
      throw new Error(`Cannot send email notification: recipient ${message.recipient.id} has no email`);
    }
    await this.transport.sendEmail(
      message.recipient.email,
      message.subject,
      message.body,
    );
  }
}
