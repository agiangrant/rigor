export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  digest: 'none' | 'daily' | 'weekly';
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
}
