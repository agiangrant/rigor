/**
 * NotificationService — orchestrates sending notifications through registered channels.
 *
 * Intended location: src/services/notificationService.ts
 *
 * This implementation assumes:
 * - Direct injection architecture (Question 1, Option A)
 * - Fire-and-forget failure semantics (Question 2, Option A)
 *
 * If different architecture decisions are made, this file will need revision.
 */

import type { NotificationChannel, NotificationMessage, Recipient } from '../notifications/types';

export interface BookingCreatedInfo {
  bookingId: string;
  roomName: string;
  bookerName: string;
  startTime: Date;
  endTime: Date;
  title: string;
}

export interface BookingCancelledInfo {
  bookingId: string;
  roomName: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export class NotificationService {
  constructor(private readonly channels: NotificationChannel[]) {}

  async bookingCreated(owner: Recipient, info: BookingCreatedInfo): Promise<void> {
    const message: NotificationMessage = {
      type: 'booking.created',
      recipient: owner,
      subject: `New booking: ${info.roomName} — ${info.title}`,
      body: [
        `A new booking has been created for your room "${info.roomName}".`,
        ``,
        `Title: ${info.title}`,
        `Booked by: ${info.bookerName}`,
        `Time: ${info.startTime.toISOString()} — ${info.endTime.toISOString()}`,
        `Booking ID: ${info.bookingId}`,
      ].join('\n'),
    };

    await this.sendToAllChannels(message);
  }

  async bookingCancelled(booker: Recipient, info: BookingCancelledInfo): Promise<void> {
    const message: NotificationMessage = {
      type: 'booking.cancelled',
      recipient: booker,
      subject: `Cancelled: ${info.roomName} — ${info.title}`,
      body: [
        `Your booking for "${info.roomName}" has been cancelled.`,
        ``,
        `Title: ${info.title}`,
        `Time: ${info.startTime.toISOString()} — ${info.endTime.toISOString()}`,
        `Booking ID: ${info.bookingId}`,
      ].join('\n'),
    };

    await this.sendToAllChannels(message);
  }

  private async sendToAllChannels(message: NotificationMessage): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((channel) => channel.send(message)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        // Fire-and-forget: log the error but don't throw.
        // In production, this would use a structured logger.
        console.error(`Notification channel failed:`, result.reason);
      }
    }
  }
}
