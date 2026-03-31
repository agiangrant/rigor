/**
 * Tests for NotificationService.
 *
 * Intended location: src/__tests__/notificationService.test.ts
 *
 * Written test-first per /tdd. These tests assume the "direct injection"
 * architecture (Question 1, Option A) since it is the recommended approach.
 * If a different architecture is chosen, these tests will need adjustment.
 *
 * These tests also assume "fire-and-forget" failure semantics (Question 2, Option A).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../services/notificationService';
import type { NotificationChannel, Recipient } from '../notifications/types';

function mockChannel(name: string): NotificationChannel {
  return { name, send: vi.fn().mockResolvedValue(undefined) };
}

describe('NotificationService', () => {
  let emailChannel: NotificationChannel;
  let service: NotificationService;

  beforeEach(() => {
    emailChannel = mockChannel('email');
    service = new NotificationService([emailChannel]);
  });

  describe('bookingCreated', () => {
    const owner: Recipient = { id: 'owner-1', email: 'owner@example.com', name: 'Room Owner' };
    const bookingInfo = {
      bookingId: 'booking-1',
      roomName: 'Conference Room A',
      bookerName: 'Jane Doe',
      startTime: new Date('2026-04-01T10:00:00Z'),
      endTime: new Date('2026-04-01T11:00:00Z'),
      title: 'Sprint Planning',
    };

    it('sends a notification to the room owner via all channels', async () => {
      await service.bookingCreated(owner, bookingInfo);

      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      const sentMessage = vi.mocked(emailChannel.send).mock.calls[0][0];
      expect(sentMessage.type).toBe('booking.created');
      expect(sentMessage.recipient).toBe(owner);
      expect(sentMessage.subject).toContain('Conference Room A');
    });

    it('sends through multiple channels when configured', async () => {
      const slackChannel = mockChannel('slack');
      service = new NotificationService([emailChannel, slackChannel]);

      await service.bookingCreated(owner, bookingInfo);

      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      expect(slackChannel.send).toHaveBeenCalledTimes(1);
    });

    it('does not throw when a channel fails (fire-and-forget)', async () => {
      vi.mocked(emailChannel.send).mockRejectedValue(new Error('SMTP down'));

      // Should not throw — booking success should not depend on notification success
      await expect(service.bookingCreated(owner, bookingInfo)).resolves.toBeUndefined();
    });
  });

  describe('bookingCancelled', () => {
    const booker: Recipient = { id: 'user-1', email: 'booker@example.com', name: 'Jane Doe' };
    const cancellationInfo = {
      bookingId: 'booking-1',
      roomName: 'Conference Room A',
      title: 'Sprint Planning',
      startTime: new Date('2026-04-01T10:00:00Z'),
      endTime: new Date('2026-04-01T11:00:00Z'),
    };

    it('sends a cancellation confirmation to the booker via all channels', async () => {
      await service.bookingCancelled(booker, cancellationInfo);

      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      const sentMessage = vi.mocked(emailChannel.send).mock.calls[0][0];
      expect(sentMessage.type).toBe('booking.cancelled');
      expect(sentMessage.recipient).toBe(booker);
      expect(sentMessage.subject).toContain('Cancelled');
    });

    it('does not throw when a channel fails (fire-and-forget)', async () => {
      vi.mocked(emailChannel.send).mockRejectedValue(new Error('SMTP down'));

      await expect(service.bookingCancelled(booker, cancellationInfo)).resolves.toBeUndefined();
    });
  });

  describe('with no channels configured', () => {
    it('completes without error when no channels are registered', async () => {
      service = new NotificationService([]);
      const owner: Recipient = { id: 'owner-1', email: 'owner@example.com', name: 'Owner' };

      await expect(
        service.bookingCreated(owner, {
          bookingId: 'b-1',
          roomName: 'Room',
          bookerName: 'User',
          startTime: new Date(),
          endTime: new Date(),
          title: 'Test',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
