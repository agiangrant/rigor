import { db } from '../db';

export interface Account {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  frozen: boolean;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export class TransferService {
  async transfer(fromAccountId: string, toAccountId: string, amount: number): Promise<Transfer> {
    if (amount <= 0) throw new Error('Transfer amount must be positive');
    if (fromAccountId === toAccountId) throw new Error('Cannot transfer to same account');

    const fromAccount = await db.accounts.findById(fromAccountId);
    if (!fromAccount) throw new Error('Source account not found');

    const toAccount = await db.accounts.findById(toAccountId);
    if (!toAccount) throw new Error('Destination account not found');

    if (fromAccount.frozen) throw new Error('Source account is frozen');
    if (toAccount.frozen) throw new Error('Destination account is frozen');

    if (fromAccount.currency !== toAccount.currency) {
      throw new Error(`Currency mismatch: ${fromAccount.currency} vs ${toAccount.currency}`);
    }

    if (fromAccount.balance < amount) throw new Error('Insufficient funds');

    await db.accounts.update(fromAccountId, { balance: fromAccount.balance - amount });
    await db.accounts.update(toAccountId, { balance: toAccount.balance + amount });

    const transfer = await db.transfers.create({
      fromAccountId,
      toAccountId,
      amount,
      currency: fromAccount.currency,
      status: 'completed',
      createdAt: new Date(),
    });

    return transfer;
  }
}
