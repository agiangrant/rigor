import { db } from '../db';
import type { NotificationSettings, User } from '../models/user';

export class NotificationPreferencesService {
  async getPreferences(userId: string): Promise<NotificationSettings> {
    const user = await db.users.findById(userId);
    if (!user) throw new Error('User not found');
    return user.preferences.notifications;
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const user = await db.users.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate quiet hours format
    if (updates.quietHoursStart !== undefined) {
      if (!this.isValidTime(updates.quietHoursStart)) {
        throw new Error('Invalid quiet hours start time format. Use HH:MM.');
      }
    }
    if (updates.quietHoursEnd !== undefined) {
      if (!this.isValidTime(updates.quietHoursEnd)) {
        throw new Error('Invalid quiet hours end time format. Use HH:MM.');
      }
    }

    // Validate that at least one channel remains enabled
    const merged = { ...user.preferences.notifications, ...updates };
    if (!merged.email && !merged.push && !merged.sms) {
      throw new Error('At least one notification channel must be enabled');
    }

    // Quiet hours must be a complete pair
    if ((merged.quietHoursStart && !merged.quietHoursEnd) ||
        (!merged.quietHoursStart && merged.quietHoursEnd)) {
      throw new Error('Quiet hours must specify both start and end times');
    }

    // Save by updating the full user object
    const updatedUser = await db.users.update(userId, {
      ...user,
      preferences: {
        ...user.preferences,
        notifications: merged,
      },
    });

    return updatedUser.preferences.notifications;
  }

  async getOrganizationDefaults(orgId: string): Promise<NotificationSettings> {
    // Get all users in the org and find the most common settings
    const users = await db.users.findByOrganization(orgId);
    if (users.length === 0) {
      return {
        email: true,
        push: true,
        sms: false,
        digest: 'weekly',
      };
    }

    // Count the most popular digest setting
    const digestCounts: Record<string, number> = {};
    for (const user of users) {
      const digest = user.preferences?.notifications?.digest || 'none';
      digestCounts[digest] = (digestCounts[digest] || 0) + 1;
    }
    const popularDigest = Object.entries(digestCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as 'none' | 'daily' | 'weekly';

    // Count channel preferences
    let emailCount = 0, pushCount = 0, smsCount = 0;
    for (const user of users) {
      if (user.preferences?.notifications?.email) emailCount++;
      if (user.preferences?.notifications?.push) pushCount++;
      if (user.preferences?.notifications?.sms) smsCount++;
    }

    return {
      email: emailCount > users.length / 2,
      push: pushCount > users.length / 2,
      sms: smsCount > users.length / 2,
      digest: popularDigest,
    };
  }

  async isInQuietHours(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Simple string comparison works for HH:MM format
    if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
      // Normal range: e.g., 22:00-23:00
      return currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd;
    } else {
      // Overnight range: e.g., 22:00-08:00
      return currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd;
    }
  }

  async shouldNotify(userId: string, channel: 'email' | 'push' | 'sms'): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs[channel]) return false;

    const inQuietHours = await this.isInQuietHours(userId);
    if (inQuietHours && channel !== 'email') return false; // Email ignores quiet hours

    return true;
  }

  private isValidTime(time: string): boolean {
    // Duplicated from validationHelpers.ts — same regex
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  }
}
