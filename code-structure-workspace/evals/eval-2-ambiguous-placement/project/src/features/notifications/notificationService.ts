import { sendEmail } from '../../shared/email/sender';

export class NotificationService {
  static async notify(userId: string, message: string) {
    // Currently email-only, planning to add push/SMS
    await sendEmail(userId, 'Notification', message);
  }
}
