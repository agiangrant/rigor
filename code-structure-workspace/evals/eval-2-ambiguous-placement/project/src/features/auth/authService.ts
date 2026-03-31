import { db } from '../../shared/db/client';
import { sendEmail } from '../../shared/email/sender';

export class AuthService {
  static async login(email: string, password: string) { return { token: 'jwt' }; }
  static async register(email: string, password: string) {
    const user = await db.users.create({ email, password });
    await sendEmail(email, 'Welcome!', 'Thanks for signing up.');
    return user;
  }
  static async resetPassword(email: string) {
    await sendEmail(email, 'Reset Password', 'Click here to reset.');
  }
}
