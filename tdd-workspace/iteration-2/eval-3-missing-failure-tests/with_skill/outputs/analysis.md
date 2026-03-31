# Transfer Service Test Coverage Analysis

## Test Infrastructure

- **Framework:** Vitest (configured in `vitest.config.ts`, globals enabled, node environment)
- **Conventions:** Tests in `src/__tests__/`, mocking via `vi.mock('../db')`
- **Mocking pattern:** `vi.mocked(db.accounts.findById)` with `mockResolvedValueOnce` for ordered call results

## Existing Coverage

One test: the happy path for a successful transfer between two valid USD accounts with sufficient funds. This test verifies:
- The returned transfer has `status: 'completed'` and correct `amount`
- Both accounts are updated with correct new balances

## Missing Test Cases

### Happy Path Variations

1. **Transfer that drains the source account exactly to zero** — `balance === amount` is the boundary condition for the `balance < amount` check. This confirms the `<` (not `<=`) operator is correct.
2. **Transfer of a very small amount (e.g., 0.01)** — confirms fractional amounts work. (Lower priority; mostly validates the same path.)

### Failure Modes — Input Validation

3. **Amount is zero** — should throw "Transfer amount must be positive"
4. **Amount is negative** — should throw "Transfer amount must be positive"
5. **Same account for source and destination** — should throw "Cannot transfer to same account"

### Failure Modes — Account Lookup

6. **Source account not found** — `findById` returns `null` for the first call. Should throw "Source account not found"
7. **Destination account not found** — source exists, but `findById` returns `null` for the second call. Should throw "Destination account not found"

### Failure Modes — Account State

8. **Source account is frozen** — should throw "Source account is frozen"
9. **Destination account is frozen** — should throw "Destination account is frozen"

### Failure Modes — Business Rules

10. **Currency mismatch** — source is USD, destination is EUR. Should throw "Currency mismatch: USD vs EUR"
11. **Insufficient funds** — source balance is less than the transfer amount. Should throw "Insufficient funds"

### Failure Modes — Database Errors

12. **Database fails during account debit (first update)** — `db.accounts.update` rejects on the first call. The error should propagate. Critically, this also reveals that the **credit may not have happened yet**, so partial state is not an issue for _this_ failure point.
13. **Database fails during account credit (second update)** — `db.accounts.update` succeeds for debit but rejects for credit. The error propagates, but **the debit has already been applied without the credit** — the system is now in an inconsistent state. This is a real production bug (see integration test evaluation below).
14. **Database fails during transfer record creation** — both balance updates succeed but `db.transfers.create` rejects. The money moved but there is no record of it.

### Verification of Call Order and Guard Behavior

15. **No database writes when validation fails** — when any validation error is thrown (e.g., insufficient funds), `db.accounts.update` and `db.transfers.create` should NOT have been called.

## Integration Test Evaluation

Integration tests **are needed** for this service, but cannot be written with the current project setup (no real database, no transaction support). Here is why:

1. **Non-atomic multi-step writes (CRITICAL):** The `transfer` method performs three sequential writes — debit source, credit destination, create transfer record — with no transaction wrapping. A failure between steps 1 and 2 debits money from the source without crediting the destination. A failure between steps 2 and 3 moves money with no record. A unit test with mocks can _detect_ these failure points (tests 13-14 above), but only an integration test against a real database can verify that a transaction rollback actually restores consistency. **This is both a test gap and a potential production bug that should be flagged.**

2. **Raw database operations:** `db.accounts.findById`, `db.accounts.update`, and `db.transfers.create` are raw database calls. Unit tests with mocks cannot verify that these queries actually work against a real data store.

**Recommendation:** The non-atomic writes should be wrapped in a database transaction. Integration tests should verify that a failure mid-transfer rolls back all changes. This is documented here as a required follow-up since the current project has no real database to test against.

## Summary

| Category | Count |
|----------|-------|
| Existing tests | 1 (happy path) |
| Missing happy path variations | 1 |
| Missing input validation tests | 3 |
| Missing account lookup tests | 2 |
| Missing account state tests | 2 |
| Missing business rule tests | 2 |
| Missing database error tests | 3 |
| Missing guard verification | 1 |
| **Total new tests** | **14** |
