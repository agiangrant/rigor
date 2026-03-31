import { Pool } from 'pg';

const pool = new Pool();

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: Date;
  lineItems: LineItem[];
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export async function createInvoice(userId: string, lineItems: LineItem[], dueDate: Date): Promise<Invoice> {
  const amount = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  if (amount <= 0) throw new Error('Invoice amount must be positive');
  if (lineItems.length === 0) throw new Error('Invoice must have at least one line item');
  if (dueDate < new Date()) throw new Error('Due date must be in the future');

  const result = await pool.query(
    'INSERT INTO invoices (user_id, amount, status, due_date, line_items) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, amount, 'draft', dueDate, JSON.stringify(lineItems)]
  );

  return mapRow(result.rows[0]);
}

export async function sendInvoice(invoiceId: string): Promise<Invoice> {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
  if (result.rows.length === 0) throw new Error('Invoice not found');

  const invoice = mapRow(result.rows[0]);
  if (invoice.status !== 'draft') throw new Error(`Cannot send invoice in status: ${invoice.status}`);

  const updated = await pool.query(
    'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
    ['sent', invoiceId]
  );

  return mapRow(updated.rows[0]);
}

export async function markPaid(invoiceId: string): Promise<Invoice> {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
  if (result.rows.length === 0) throw new Error('Invoice not found');

  const invoice = mapRow(result.rows[0]);
  if (invoice.status === 'paid') throw new Error('Invoice is already paid');
  if (invoice.status === 'draft') throw new Error('Cannot mark unsent invoice as paid');

  const updated = await pool.query(
    'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
    ['paid', invoiceId]
  );

  return mapRow(updated.rows[0]);
}

function mapRow(row: any): Invoice {
  return {
    id: row.id,
    userId: row.user_id,
    amount: parseFloat(row.amount),
    status: row.status,
    dueDate: new Date(row.due_date),
    lineItems: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
  };
}
