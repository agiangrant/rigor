# Invoice Service Test Analysis

## Step 1: Establish Test Infrastructure

**No test infrastructure exists.** The project has zero test dependencies, no test scripts, no test configuration, and no test files. Before writing any tests, the test framework decision must be made.

### The Options

#### Option A: Vitest

**Trade-offs:**
- Native ESM support — this project uses `"type": "module"` and `"module": "ESNext"`, which Vitest handles natively with zero config
- Built-in TypeScript support via esbuild — no separate ts-jest or transform config needed
- Jest-compatible API (`describe`, `it`, `expect`, `vi.fn()`, `vi.mock()`) — familiar if you know Jest
- Fast startup and execution (Vite's transform pipeline)
- Built-in coverage via v8/istanbul

**Fit for this project:** Excellent. The ESM + TypeScript setup is exactly what Vitest is designed for. Minimal config required.

**Config needed:** `vitest.config.ts` (or inline in `package.json`), add `vitest` to devDependencies, add `test` script.

#### Option B: Jest with ts-jest

**Trade-offs:**
- Most widely used test framework in the JS/TS ecosystem — largest community, most examples
- Requires additional configuration for ESM projects (`ts-jest` with `useESM: true`, or `@swc/jest`, plus `extensionsToTreatAsEsm` and `moduleNameMapper` workarounds)
- `"type": "module"` in package.json creates friction — Jest's ESM support is still experimental
- Heavier dependency tree

**Fit for this project:** Workable but requires fighting the ESM configuration. The project's module setup creates unnecessary friction with Jest.

#### Option C: Node.js built-in test runner (`node:test`)

**Trade-offs:**
- Zero dependencies — ships with Node.js 18+
- Native ESM support
- Less mature mocking API, no built-in snapshot testing
- Requires a separate TypeScript compilation step (or `tsx`/`ts-node` loader) since it doesn't transform TS natively
- Less ecosystem tooling (IDE integrations, watch mode, coverage reporting are all more manual)

**Fit for this project:** Viable for simple cases but the mocking story is weaker, which matters for this service since every function hits `pg.Pool` and needs mocking.

### Structure Recommendation

The project has a flat `src/` directory with a single source file. Tests should be **co-located** as `src/invoiceService.test.ts` — this matches the simplicity of the project and keeps tests next to the code they exercise. No need for a separate `__tests__/` directory with only one source file.

### Recommendation

**Vitest** is the best fit. The project is ESM + TypeScript with no existing test tooling, and Vitest handles that combination with the least friction. The mocking API (`vi.mock`, `vi.fn`) is sufficient for mocking the `pg` Pool, and it requires near-zero configuration for this project shape.

---

## Decision Required

**Which test framework should be used?** The options above need a decision before any tests can be written.

Specifically:
1. **Framework**: Vitest (recommended), Jest, or Node built-in test runner?
2. **Test location**: Co-located `src/invoiceService.test.ts` (recommended)?
3. **Any additional test utilities** needed (e.g., faker for test data)?

---

## What Will Be Tested (pending infrastructure decision)

Once the framework is chosen, here is the test plan for `createInvoice`, `sendInvoice`, and `markPaid`:

### createInvoice

**Happy paths:**
- Creates invoice with valid line items, returns invoice with correct amount, status 'draft', and all fields mapped
- Correctly calculates amount from multiple line items (sum of quantity * unitPrice)

**Failure modes:**
- Throws when line items array is empty
- Throws when calculated amount is zero or negative (e.g., zero quantity, zero price)
- Throws when due date is in the past
- Handles database insert failure (pool.query rejects)

### sendInvoice

**Happy paths:**
- Sends a draft invoice, returns invoice with status 'sent'

**Failure modes:**
- Throws 'Invoice not found' when ID doesn't match any row
- Throws when invoice status is 'sent' (already sent)
- Throws when invoice status is 'paid'
- Throws when invoice status is 'overdue'
- Handles database query/update failure

### markPaid

**Happy paths:**
- Marks a sent invoice as paid, returns invoice with status 'paid'
- Marks an overdue invoice as paid (valid transition: overdue -> paid)

**Failure modes:**
- Throws 'Invoice not found' when ID doesn't match any row
- Throws 'Invoice is already paid' when status is 'paid'
- Throws 'Cannot mark unsent invoice as paid' when status is 'draft'
- Handles database query/update failure

### Integration test signals (flagged per TDD skill Step 5)

The following warrant integration tests but cannot be written as unit tests:
- **Raw SQL queries**: All three functions use raw SQL strings. Unit tests with mocked `pool.query` cannot verify SQL correctness. Integration tests against a real Postgres instance would be needed to validate query syntax, column mapping, and constraint handling.
- **Serialization boundary**: `mapRow` converts database rows to domain objects, including `JSON.parse` on `line_items` and `parseFloat` on `amount`. The actual shape of Postgres rows may differ from what unit test mocks provide.
- **Date comparison in createInvoice**: `dueDate < new Date()` depends on system clock. Unit tests can control this but integration tests would verify real behavior.

These integration tests are out of scope for initial test setup but are documented as required follow-up.
