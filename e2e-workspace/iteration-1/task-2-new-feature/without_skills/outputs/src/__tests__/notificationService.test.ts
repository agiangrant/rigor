import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notifications/notificationService';
import type { NotificationChannel, Notification } from '../notifications/types';

function createMockChannel(name: string): NotificationChannel & { send: ReturnType<typeof vi.fn> } {
  return {
    name,
    send: vi.fn().mockResolvedValue(undefined),
  };
}

describe('NotificationService', () => {
  let emailChannel: ReturnType<typeof createMockChannel>;
  let slackChannel: ReturnType<typeof createMockChannel>;
  let service: NotificationService;

  beforeEach(() => {
    emailChannel = createMockChannel('email');
    slackChannel = createMockChannel('slack');
    service = new NotificationService([emailChannel, slackChannel]);
  });

  describe('send', () => {
    it('dispatches notification to all channels', async () => {
      const notification: Notification = {
        type: 'booking_created',
        recipientEmail: 'owner@example.com',
        subject: 'New booking',
        body: 'A room was booked.',
      };

      await service.send(notification);

      expect(emailChannel.send).toHaveBeenCalledWith(notification);
      expect(slackChannel.send).toHaveBeenCalledWith(notification);
    });

    it('continues sending to other channels if one fails', async () => {
      emailChannel.send.mockRejectedValue(new Error('SMTP down'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notification: Notification = {
        type: 'booking_created',
        recipientEmail: 'owner@example.com',
        subject: 'Test',
        body: 'Test body',
      };

      await service.send(notification);

      expect(slackChannel.send).toHaveBeenCalledWith(notification);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('email'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles all channels failing without throwing', async () => {
      emailChannel.send.mockRejectedValue(new Error('fail'));
      slackChannel.send.mockRejectedValue(new Error('fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notification: Notification = {
        type: 'booking_cancelled',
        recipientEmail: 'user@example.com',
        subject: 'Cancelled',
        body: 'Your booking was cancelled.',
      };

      await expect(service.send(notification)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });

  describe('notifyBookingCreated', () => {
    it('sends a booking_created notification to the room owner', async () => {
      await service.notifyBookingCreated({
        ownerEmail: 'owner@example.com',
        roomName: 'Alpha',
        bookerName: 'user-1',
        title: 'Standup',
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T09:30:00Z'),
      });

      expect(emailChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'booking_created',
          recipientEmail: 'owner@example.com',
          subject: 'New booking: Standup',
        })
      );

      const notification = emailChannel.send.mock.calls[0][0] as Notification;
      expect(notification.body).toContain('Alpha');
      expect(notification.body).toContain('user-1');
    });
  });

  describe('notifyBookingCancelled', () => {
    it('sends a booking_cancelled notification to the booker', async () => {
      await service.notifyBookingCancelled({
        bookerEmail: 'booker@example.com',
        roomName: 'Beta',
        title: 'Retro',
        startTime: new Date('2026-04-01T14:00:00Z'),
        endTime: new Date('2026-04-01T15:00:00Z'),
      });

      expect(emailChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'booking_cancelled',
          recipientEmail: 'booker@example.com',
          subject: 'Booking cancelled: Retro',
        })
      );

      const notification = emailChannel.send.mock.calls[0][0] as Notification;
      expect(notification.body).toContain('Beta');
      expect(notification.body).toContain('cancelled');
    });
  });
});
