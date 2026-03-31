# Analysis: TransferService Missing Failure Tests

## Current Coverage

The existing test suite has a single test covering the happy path: a successful transfer between two valid, unfrozen accounts with matching currencies and sufficient funds. This leaves all eight error branches completely untested.

## Error Paths in `transfer()` (all untested)

| # | Condition | Error Message | Line |
|---|-----------|--------------|------|
| 1 | `amount <= 0` | "Transfer amount must be positive" | 23 |
| 2 | `fromAccountId === toAccountId` | "Cannot transfer to same account" | 24 |
| 3 | Source account not found (`null`) | "Source account not found" | 27 |
| 4 | Destination account not found (`null`) | "Destination account not found" | 29 |
| 5 | Source account frozen | "Source account is frozen" | 32 |
| 6 | Destination account frozen | "Destination account is frozen" | 33 |
| 7 | Currency mismatch between accounts | "Currency mismatch: X vs Y" | 36 |
| 8 | `fromAccount.balance < amount` | "Insufficient funds" | 39 |

## Side-Effect Verification Gaps

Beyond error messages, the tests should verify that when an error is thrown:
- `db.accounts.update` is never called (no partial balance mutation)
- `db.transfers.create` is never called (no ghost transfer records)

This matters because the service lacks a transaction/rollback mechanism. If validation fails after a partial write, data would be corrupted. The tests should confirm the guard clauses prevent any writes.

## Boundary Cases Worth Adding

- Zero amount (boundary of the `<= 0` check)
- Negative amount
- Transfer of exact full balance (should succeed -- boundary of `<` vs `<=` in the insufficient funds check)

## Plan

Add tests for all eight error paths plus the exact-balance boundary, verifying both the thrown error message and that no database writes occur on failure.
