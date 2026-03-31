import { Notification, NotificationChannel } from './types';

export class NotificationService {
  private channels: NotificationChannel[];

  constructor(channels: NotificationChannel[]) {
    this.channels = channels;
  }

  async send(notification: Notification): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((channel) => channel.send(notification))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        console.error(
          `Notification channel "${this.channels[i].name}" failed:`,
          result.reason
        );
      }
    }
  }

  async notifyBookingCreated(params: {
    ownerEmail: string;
    roomName: string;
    bookerName: string;
    title: string;
    startTime: Date;
    endTime: Date;
  }): Promise<void> {
    await this.send({
      type: 'booking_created',
      recipientEmail: params.ownerEmail,
      subject: `New booking: ${params.title}`,
      body: [
        `Your room "${params.roomName}" has been booked.`,
        `Booked by: ${params.bookerName}`,
        `Title: ${params.title}`,
        `Time: ${params.startTime.toISOString()} - ${params.endTime.toISOString()}`,
      ].join('\n'),
      metadata: {
        roomName: params.roomName,
        bookerName: params.bookerName,
      },
    });
  }

  async notifyBookingCancelled(params: {
    bookerEmail: string;
    roomName: string;
    title: string;
    startTime: Date;
    endTime: Date;
  }): Promise<void> {
    await this.send({
      type: 'booking_cancelled',
      recipientEmail: params.bookerEmail,
      subject: `Booking cancelled: ${params.title}`,
      body: [
        `Your booking has been cancelled.`,
        `Room: ${params.roomName}`,
        `Title: ${params.title}`,
        `Time: ${params.startTime.toISOString()} - ${params.endTime.toISOString()}`,
      ].join('\n'),
      metadata: {
        roomName: params.roomName,
      },
    });
  }
}
