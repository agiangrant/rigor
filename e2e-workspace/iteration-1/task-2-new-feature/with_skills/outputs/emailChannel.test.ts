/**
 * Tests for EmailChannel.
 *
 * Intended location: src/__tests__/emailChannel.test.ts
 *
 * Written test-first per /tdd. These tests define the contract
 * for the email channel before implementation exists.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailChannel } from '../notifications/channels/emailChannel';
import type { EmailTransport } from '../notifications/channels/emailChannel';
import type { NotificationMessage } from '../notifications/types';

describe('EmailChannel', () => {
  let transport: EmailTransport;
  let channel: EmailChannel;

  beforeEach(() => {
    transport = { sendEmail: vi.fn().mockResolvedValue(undefined) };
    channel = new EmailChannel(transport);
  });

  const makeMessage = (overrides?: Partial<NotificationMessage>): NotificationMessage => ({
    type: 'booking.created',
    recipient: { id: 'user-1', email: 'owner@example.com', name: 'Room Owner' },
    subject: 'New booking for Conference Room A',
    body: 'A booking has been created for your room.',
    ...overrides,
  });

  it('has the name "email"', () => {
    expect(channel.name).toBe('email');
  });

  it('sends an email via the transport', async () => {
    const message = makeMessage();
    await channel.send(message);

    expect(transport.sendEmail).toHaveBeenCalledWith(
      'owner@example.com',
      'New booking for Conference Room A',
      'A booking has been created for your room.',
    );
  });

  it('throws when recipient has no email', async () => {
    const message = makeMessage({
      recipient: { id: 'user-2', email: '', name: 'No Email User' },
    });

    await expect(channel.send(message)).rejects.toThrow(
      'Cannot send email notification: recipient user-2 has no email',
    );
  });

  it('propagates transport errors', async () => {
    vi.mocked(transport.sendEmail).mockRejectedValue(new Error('SMTP connection failed'));
    const message = makeMessage();

    await expect(channel.send(message)).rejects.toThrow('SMTP connection failed');
  });
});
