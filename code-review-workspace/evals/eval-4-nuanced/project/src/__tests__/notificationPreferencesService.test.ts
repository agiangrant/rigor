import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationPreferencesService } from '../services/notificationPreferencesService';
import { db } from '../db';

vi.mock('../db');

const mockUser = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  organizationId: 'org1',
  preferences: {
    theme: 'light' as const,
    language: 'en',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      push: true,
      sms: false,
      digest: 'weekly' as const,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    },
  },
  createdAt: new Date(),
};

describe('NotificationPreferencesService', () => {
  const service = new NotificationPreferencesService();
  beforeEach(() => vi.clearAllMocks());

  describe('getPreferences', () => {
    it('returns notification settings for a user', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(mockUser);
      const result = await service.getPreferences('u1');
      expect(result.email).toBe(true);
      expect(result.push).toBe(true);
      expect(result.sms).toBe(false);
      expect(result.digest).toBe('weekly');
    });

    it('throws when user not found', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(null);
      await expect(service.getPreferences('unknown')).rejects.toThrow('User not found');
    });
  });

  describe('updatePreferences', () => {
    it('updates a single notification setting', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(mockUser);
      vi.mocked(db.users.update).mockImplementation(async (id, data) => data as any);

      const result = await service.updatePreferences('u1', { sms: true });
      expect(result.sms).toBe(true);
      expect(result.email).toBe(true); // unchanged
    });

    it('rejects invalid quiet hours format', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(mockUser);
      await expect(
        service.updatePreferences('u1', { quietHoursStart: '25:00' })
      ).rejects.toThrow('Invalid quiet hours start time format');
    });

    it('rejects disabling all channels', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(mockUser);
      await expect(
        service.updatePreferences('u1', { email: false, push: false, sms: false })
      ).rejects.toThrow('At least one notification channel must be enabled');
    });

    it('rejects incomplete quiet hours pair', async () => {
      const userWithoutQuietHours = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          notifications: {
            ...mockUser.preferences.notifications,
            quietHoursStart: undefined,
            quietHoursEnd: undefined,
          },
        },
      };
      vi.mocked(db.users.findById).mockResolvedValue(userWithoutQuietHours);
      await expect(
        service.updatePreferences('u1', { quietHoursStart: '22:00' })
      ).rejects.toThrow('Quiet hours must specify both start and end times');
    });
  });

  describe('shouldNotify', () => {
    it('returns false when channel is disabled', async () => {
      vi.mocked(db.users.findById).mockResolvedValue(mockUser);
      const result = await service.shouldNotify('u1', 'sms');
      expect(result).toBe(false);
    });

    it('returns true when channel is enabled and not in quiet hours', async () => {
      const userNoQuietHours = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          notifications: {
            ...mockUser.preferences.notifications,
            quietHoursStart: undefined,
            quietHoursEnd: undefined,
          },
        },
      };
      vi.mocked(db.users.findById).mockResolvedValue(userNoQuietHours);
      const result = await service.shouldNotify('u1', 'email');
      expect(result).toBe(true);
    });
  });
});
