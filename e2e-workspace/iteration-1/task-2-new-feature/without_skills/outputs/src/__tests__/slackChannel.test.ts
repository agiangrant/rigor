import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackChannel, SlackClient, SlackUserResolver } from '../notifications/slackChannel';
import type { Notification } from '../notifications/types';

describe('SlackChannel', () => {
  let client: SlackClient & { postMessage: ReturnType<typeof vi.fn> };
  let resolver: SlackUserResolver & { resolveChannel: ReturnType<typeof vi.fn> };
  let channel: SlackChannel;

  beforeEach(() => {
    client = { postMessage: vi.fn().mockResolvedValue(undefined) };
    resolver = { resolveChannel: vi.fn().mockResolvedValue('C12345') };
    channel = new SlackChannel(client, resolver);
  });

  it('has name "slack"', () => {
    expect(channel.name).toBe('slack');
  });

  it('resolves user channel and posts message', async () => {
    const notification: Notification = {
      type: 'booking_created',
      recipientEmail: 'owner@example.com',
      subject: 'New booking: Standup',
      body: 'Your room has been booked.',
    };

    await channel.send(notification);

    expect(resolver.resolveChannel).toHaveBeenCalledWith('owner@example.com');
    expect(client.postMessage).toHaveBeenCalledWith(
      'C12345',
      '*New booking: Standup*\nYour room has been booked.'
    );
  });

  it('skips posting when user channel cannot be resolved', async () => {
    resolver.resolveChannel.mockResolvedValue(null);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const notification: Notification = {
      type: 'booking_cancelled',
      recipientEmail: 'unknown@example.com',
      subject: 'Cancelled',
      body: 'Cancelled.',
    };

    await channel.send(notification);

    expect(client.postMessage).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown@example.com')
    );

    consoleSpy.mockRestore();
  });

  it('propagates Slack API errors', async () => {
    client.postMessage.mockRejectedValue(new Error('Slack API rate limited'));

    const notification: Notification = {
      type: 'booking_created',
      recipientEmail: 'owner@example.com',
      subject: 'Test',
      body: 'Test',
    };

    await expect(channel.send(notification)).rejects.toThrow('Slack API rate limited');
  });
});
