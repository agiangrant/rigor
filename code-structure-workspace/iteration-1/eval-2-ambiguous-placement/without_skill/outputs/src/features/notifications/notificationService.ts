import { sendEmail } from '../../shared/email/sender';
import { AuditLogger } from '../../shared/audit/logger';

export class NotificationService {
  static async notify(userId: string, message: string) {
    // Currently email-only, planning to add push/SMS
    await sendEmail(userId, 'Notification', message);
    await AuditLogger.log(userId, 'notify', 'notification', undefined, { message });
  }
}
