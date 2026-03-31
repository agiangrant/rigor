# Invoice Service Test Analysis

## Source Under Test

`src/invoiceService.ts` — Three async functions that manage invoice lifecycle against a PostgreSQL database via the `pg` library.

## Architecture Observations

- **Hard-coupled database dependency.** The module creates a `Pool` at module scope (`const pool = new Pool()`) and uses it directly inside every exported function. There is no dependency injection — the pool is not passed in or exported.
- **No test infrastructure.** The project has zero test runner, no test framework in devDependencies, and no test scripts.
- **Module-scoped side effect.** `new Pool()` executes on import, meaning any test file that imports the module will attempt to create a real Postgres connection unless the `pg` module is mocked.

## Test Strategy

### Framework Choice

Vitest — it handles ESM natively (the project uses `"type": "module"` and `"module": "ESNext"`), requires minimal configuration, and has built-in mocking.

### Mocking Approach

Mock the `pg` module at the module level using `vi.mock('pg')`. This replaces `Pool` with a mock constructor whose instance exposes a mock `query` method. Each test configures `query` to return the appropriate `{ rows: [...] }` shape.

This is the only viable approach without refactoring the source — the pool is not injectable.

### Functions and Coverage

#### `createInvoice(userId, lineItems, dueDate)`

| Scenario | Expected |
|---|---|
| Valid line items and future due date | Inserts row, returns mapped Invoice with status `'draft'` |
| Line items that sum to zero or negative amount | Throws `'Invoice amount must be positive'` |
| Empty line items array | Throws `'Invoice must have at least one line item'` |
| Due date in the past | Throws `'Due date must be in the future'` |
| Multiple line items | Amount is sum of (qty * unitPrice) for all items |
| Correct SQL parameters | Query called with `[userId, amount, 'draft', dueDate, JSON.stringify(lineItems)]` |

#### `sendInvoice(invoiceId)`

| Scenario | Expected |
|---|---|
| Invoice exists in `'draft'` status | Updates status to `'sent'`, returns mapped Invoice |
| Invoice does not exist | Throws `'Invoice not found'` |
| Invoice in `'sent'` status | Throws `'Cannot send invoice in status: sent'` |
| Invoice in `'paid'` status | Throws `'Cannot send invoice in status: paid'` |

#### `markPaid(invoiceId)`

| Scenario | Expected |
|---|---|
| Invoice exists in `'sent'` status | Updates status to `'paid'`, returns mapped Invoice |
| Invoice exists in `'overdue'` status | Updates status to `'paid'` (allowed — only `draft` and `paid` are rejected) |
| Invoice does not exist | Throws `'Invoice not found'` |
| Invoice already `'paid'` | Throws `'Invoice is already paid'` |
| Invoice in `'draft'` status | Throws `'Cannot mark unsent invoice as paid'` |

### `mapRow` (private)

Tested indirectly through all the above. Key behaviors:
- Parses `amount` via `parseFloat`
- Converts `due_date` to `Date`
- Handles `line_items` as either a JSON string or an already-parsed object

## Risks and Limitations

- **Date comparison is fragile.** `createInvoice` compares `dueDate < new Date()`, which uses wall-clock time. Tests that pass a date "just barely in the future" can be flaky. Tests use dates far in the future to avoid this.
- **Validation ordering matters.** The amount check runs before the empty-array check in `createInvoice`. An empty array produces `amount = 0`, which triggers the amount error before the length check. Tests verify this actual behavior.
- **No transaction boundaries.** `sendInvoice` and `markPaid` do a SELECT then an UPDATE in two separate queries with no transaction. Tests mock each query call independently.
