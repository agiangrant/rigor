# Transfer Service Test Coverage Analysis

## Test Infrastructure

- **Framework:** Vitest
- **Convention:** Tests in `src/__tests__/`, db module mocked via `vi.mock('../db')`
- **Pattern:** Mock `db.accounts.findById` with `mockResolvedValueOnce` for source/destination, mock `db.transfers.create` for the transfer record

## Existing Coverage

| Test | Type | Status |
|------|------|--------|
| Successfully transfers between accounts | Happy path | Covered |

The single existing test covers the primary success case: two valid, unfrozen, same-currency accounts with sufficient balance. It correctly asserts the result status, amount, and that both accounts were updated with the right balances.

## Missing Happy Path Variations

| Test | Why it matters |
|------|----------------|
| Transfers the entire account balance (balance === amount) | Boundary condition. Source balance becomes exactly 0. This is a common edge case where off-by-one errors or `<` vs `<=` bugs surface. |

## Missing Failure Modes

The `transfer` method has 8 distinct validation checks, each throwing a specific error. None are tested.

| # | Test | Error | Why it matters |
|---|------|-------|----------------|
| 1 | Rejects zero amount | "Transfer amount must be positive" | Prevents no-op transfers that could create misleading records |
| 2 | Rejects negative amount | "Transfer amount must be positive" | Prevents balance manipulation via negative transfers |
| 3 | Rejects transfer to same account | "Cannot transfer to same account" | Prevents circular transfers that inflate transaction counts |
| 4 | Rejects when source account not found | "Source account not found" | Handles deleted/invalid account IDs |
| 5 | Rejects when destination account not found | "Destination account not found" | Handles deleted/invalid account IDs for the recipient |
| 6 | Rejects when source account is frozen | "Source account is frozen" | Frozen accounts must not be able to send funds |
| 7 | Rejects when destination account is frozen | "Destination account is frozen" | Frozen accounts must not be able to receive funds |
| 8 | Rejects currency mismatch | "Currency mismatch" | Prevents silent incorrect transfers across currencies |
| 9 | Rejects insufficient funds | "Insufficient funds" | Core safety check for balance integrity |

## Side Effect Verification

For each failure mode, we should also verify that no balance updates or transfer records were created. If validation fails but `db.accounts.update` still gets called, we have a data corruption bug. This is tested by asserting `db.accounts.update` was not called and `db.transfers.create` was not called on error paths.

## Summary

- **Existing tests:** 1 (happy path only)
- **Missing tests:** 10 (1 happy path variation + 9 failure modes)
- **Total after fix:** 11 tests
