import { Notification, NotificationChannel } from './types';

export interface EmailTransport {
  sendMail(options: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void>;
}

export class EmailChannel implements NotificationChannel {
  readonly name = 'email';
  private transport: EmailTransport;

  constructor(transport: EmailTransport) {
    this.transport = transport;
  }

  async send(notification: Notification): Promise<void> {
    await this.transport.sendMail({
      to: notification.recipientEmail,
      subject: notification.subject,
      text: notification.body,
    });
  }
}
