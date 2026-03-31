import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn(() => ({
      query: mockQuery,
    })),
  };
});

import { createInvoice, sendInvoice, markPaid, type LineItem } from './invoiceService';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    user_id: 'user-1',
    amount: '150.00',
    status: 'draft',
    due_date: '2027-06-01T00:00:00.000Z',
    line_items: JSON.stringify([{ description: 'Widget', quantity: 3, unitPrice: 50 }]),
    ...overrides,
  };
}

const futureDate = new Date('2027-06-01');

beforeEach(() => {
  mockQuery.mockReset();
});

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------
describe('createInvoice', () => {
  const lineItems: LineItem[] = [{ description: 'Widget', quantity: 3, unitPrice: 50 }];

  it('inserts a draft invoice and returns the mapped result', async () => {
    const row = makeRow();
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const invoice = await createInvoice('user-1', lineItems, futureDate);

    expect(invoice).toEqual({
      id: 'inv-1',
      userId: 'user-1',
      amount: 150,
      status: 'draft',
      dueDate: new Date('2027-06-01T00:00:00.000Z'),
      lineItems: [{ description: 'Widget', quantity: 3, unitPrice: 50 }],
    });
  });

  it('passes correct parameters to the INSERT query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

    await createInvoice('user-1', lineItems, futureDate);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO invoices'),
      ['user-1', 150, 'draft', futureDate, JSON.stringify(lineItems)],
    );
  });

  it('sums multiple line items correctly', async () => {
    const items: LineItem[] = [
      { description: 'A', quantity: 2, unitPrice: 10 },
      { description: 'B', quantity: 1, unitPrice: 30 },
    ];
    const row = makeRow({ amount: '50.00' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    await createInvoice('user-1', items, futureDate);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([50]),
    );
  });

  it('throws when line items sum to zero', async () => {
    const items: LineItem[] = [{ description: 'Free', quantity: 1, unitPrice: 0 }];
    await expect(createInvoice('user-1', items, futureDate)).rejects.toThrow(
      'Invoice amount must be positive',
    );
  });

  it('throws when line items sum to a negative amount', async () => {
    const items: LineItem[] = [{ description: 'Credit', quantity: 1, unitPrice: -10 }];
    await expect(createInvoice('user-1', items, futureDate)).rejects.toThrow(
      'Invoice amount must be positive',
    );
  });

  it('throws when line items array is empty', async () => {
    // Note: empty array reduces to 0, so the amount check fires first
    await expect(createInvoice('user-1', [], futureDate)).rejects.toThrow(
      'Invoice amount must be positive',
    );
  });

  it('throws when due date is in the past', async () => {
    const pastDate = new Date('2020-01-01');
    await expect(createInvoice('user-1', lineItems, pastDate)).rejects.toThrow(
      'Due date must be in the future',
    );
  });
});

// ---------------------------------------------------------------------------
// sendInvoice
// ---------------------------------------------------------------------------
describe('sendInvoice', () => {
  it('sends a draft invoice and returns the updated result', async () => {
    const selectRow = makeRow({ status: 'draft' });
    const updateRow = makeRow({ status: 'sent' });
    mockQuery
      .mockResolvedValueOnce({ rows: [selectRow] })
      .mockResolvedValueOnce({ rows: [updateRow] });

    const invoice = await sendInvoice('inv-1');

    expect(invoice.status).toBe('sent');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE invoices SET status'),
      ['sent', 'inv-1'],
    );
  });

  it('throws when invoice does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(sendInvoice('missing')).rejects.toThrow('Invoice not found');
  });

  it('throws when invoice is already sent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ status: 'sent' })] });
    await expect(sendInvoice('inv-1')).rejects.toThrow('Cannot send invoice in status: sent');
  });

  it('throws when invoice is paid', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ status: 'paid' })] });
    await expect(sendInvoice('inv-1')).rejects.toThrow('Cannot send invoice in status: paid');
  });

  it('throws when invoice is overdue', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ status: 'overdue' })] });
    await expect(sendInvoice('inv-1')).rejects.toThrow('Cannot send invoice in status: overdue');
  });
});

// ---------------------------------------------------------------------------
// markPaid
// ---------------------------------------------------------------------------
describe('markPaid', () => {
  it('marks a sent invoice as paid', async () => {
    const selectRow = makeRow({ status: 'sent' });
    const updateRow = makeRow({ status: 'paid' });
    mockQuery
      .mockResolvedValueOnce({ rows: [selectRow] })
      .mockResolvedValueOnce({ rows: [updateRow] });

    const invoice = await markPaid('inv-1');

    expect(invoice.status).toBe('paid');
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE invoices SET status'),
      ['paid', 'inv-1'],
    );
  });

  it('marks an overdue invoice as paid', async () => {
    const selectRow = makeRow({ status: 'overdue' });
    const updateRow = makeRow({ status: 'paid' });
    mockQuery
      .mockResolvedValueOnce({ rows: [selectRow] })
      .mockResolvedValueOnce({ rows: [updateRow] });

    const invoice = await markPaid('inv-1');

    expect(invoice.status).toBe('paid');
  });

  it('throws when invoice does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(markPaid('missing')).rejects.toThrow('Invoice not found');
  });

  it('throws when invoice is already paid', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ status: 'paid' })] });
    await expect(markPaid('inv-1')).rejects.toThrow('Invoice is already paid');
  });

  it('throws when invoice is a draft', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ status: 'draft' })] });
    await expect(markPaid('inv-1')).rejects.toThrow('Cannot mark unsent invoice as paid');
  });
});

// ---------------------------------------------------------------------------
// mapRow (tested indirectly)
// ---------------------------------------------------------------------------
describe('mapRow behavior (via createInvoice)', () => {
  const lineItems: LineItem[] = [{ description: 'Item', quantity: 1, unitPrice: 100 }];

  it('parses amount from string to number', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ amount: '99.99' })] });
    const invoice = await createInvoice('user-1', lineItems, futureDate);
    expect(invoice.amount).toBe(99.99);
    expect(typeof invoice.amount).toBe('number');
  });

  it('converts due_date string to Date object', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ due_date: '2027-12-25T00:00:00.000Z' })] });
    const invoice = await createInvoice('user-1', lineItems, futureDate);
    expect(invoice.dueDate).toBeInstanceOf(Date);
    expect(invoice.dueDate.toISOString()).toBe('2027-12-25T00:00:00.000Z');
  });

  it('handles line_items when already parsed as an object', async () => {
    const parsed = [{ description: 'Pre-parsed', quantity: 2, unitPrice: 25 }];
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ line_items: parsed })] });
    const invoice = await createInvoice('user-1', lineItems, futureDate);
    expect(invoice.lineItems).toEqual(parsed);
  });

  it('maps user_id to userId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ user_id: 'u-42' })] });
    const invoice = await createInvoice('user-1', lineItems, futureDate);
    expect(invoice.userId).toBe('u-42');
  });
});
