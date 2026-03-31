import { Notification, NotificationChannel } from './types';

export interface SlackClient {
  postMessage(channel: string, text: string): Promise<void>;
}

export interface SlackUserResolver {
  resolveChannel(email: string): Promise<string | null>;
}

export class SlackChannel implements NotificationChannel {
  readonly name = 'slack';
  private client: SlackClient;
  private userResolver: SlackUserResolver;

  constructor(client: SlackClient, userResolver: SlackUserResolver) {
    this.client = client;
    this.userResolver = userResolver;
  }

  async send(notification: Notification): Promise<void> {
    const channel = await this.userResolver.resolveChannel(
      notification.recipientEmail
    );
    if (!channel) {
      console.warn(
        `Slack channel not found for ${notification.recipientEmail}, skipping`
      );
      return;
    }

    const text = `*${notification.subject}*\n${notification.body}`;
    await this.client.postMessage(channel, text);
  }
}
