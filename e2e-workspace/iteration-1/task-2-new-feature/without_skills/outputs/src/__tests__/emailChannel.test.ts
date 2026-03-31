import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailChannel, EmailTransport } from '../notifications/emailChannel';
import type { Notification } from '../notifications/types';

describe('EmailChannel', () => {
  let transport: EmailTransport & { sendMail: ReturnType<typeof vi.fn> };
  let channel: EmailChannel;

  beforeEach(() => {
    transport = {
      sendMail: vi.fn().mockResolvedValue(undefined),
    };
    channel = new EmailChannel(transport);
  });

  it('has name "email"', () => {
    expect(channel.name).toBe('email');
  });

  it('sends notification via email transport', async () => {
    const notification: Notification = {
      type: 'booking_created',
      recipientEmail: 'owner@example.com',
      subject: 'New booking: Standup',
      body: 'Your room has been booked.',
    };

    await channel.send(notification);

    expect(transport.sendMail).toHaveBeenCalledWith({
      to: 'owner@example.com',
      subject: 'New booking: Standup',
      text: 'Your room has been booked.',
    });
  });

  it('propagates transport errors', async () => {
    transport.sendMail.mockRejectedValue(new Error('SMTP connection refused'));

    const notification: Notification = {
      type: 'booking_cancelled',
      recipientEmail: 'user@example.com',
      subject: 'Cancelled',
      body: 'Cancelled.',
    };

    await expect(channel.send(notification)).rejects.toThrow('SMTP connection refused');
  });
});
