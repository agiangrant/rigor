import { db } from '../../shared/db/client';
import { sendEmail } from '../../shared/email/sender';
import { AuditLogger } from '../../shared/audit/logger';

export class AuthService {
  static async login(email: string, password: string) {
    const result = { token: 'jwt' };
    await AuditLogger.log(email, 'login', 'auth');
    return result;
  }
  static async register(email: string, password: string) {
    const user = await db.users.create({ email, password });
    await sendEmail(email, 'Welcome!', 'Thanks for signing up.');
    await AuditLogger.log(email, 'register', 'user', user.id);
    return user;
  }
  static async resetPassword(email: string) {
    await sendEmail(email, 'Reset Password', 'Click here to reset.');
    await AuditLogger.log(email, 'reset_password', 'auth');
  }
}
