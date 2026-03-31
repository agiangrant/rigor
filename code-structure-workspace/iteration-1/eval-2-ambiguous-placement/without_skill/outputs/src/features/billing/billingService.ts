import { db } from '../../shared/db/client';
import { sendEmail } from '../../shared/email/sender';
import { AuditLogger } from '../../shared/audit/logger';

export class BillingService {
  static async createInvoice(userId: string, amount: number) {
    const invoice = await db.invoices.create({ userId, amount });
    const user = await db.users.findById(userId);
    await sendEmail(user.email, 'Invoice', `Your invoice for $${amount}`);
    await AuditLogger.log(userId, 'create_invoice', 'invoice', invoice.id, { amount });
    return invoice;
  }
  static async processPayment(invoiceId: string) {
    const result = { status: 'paid' };
    await AuditLogger.log('system', 'process_payment', 'invoice', invoiceId, { status: result.status });
    return result;
  }
}
