import { db } from '../../shared/db/client';
import { sendEmail } from '../../shared/email/sender';

export class BillingService {
  static async createInvoice(userId: string, amount: number) {
    const invoice = await db.invoices.create({ userId, amount });
    const user = await db.users.findById(userId);
    await sendEmail(user.email, 'Invoice', `Your invoice for $${amount}`);
    return invoice;
  }
  static async processPayment(invoiceId: string) { return { status: 'paid' }; }
}
