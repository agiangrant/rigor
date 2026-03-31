# Debug Analysis: TypeError on `user.tier` in getOrderSummary

## 1. Holistic View

The order service has three public functions (`getOrderSummary`, `getOrdersByUser`, `processRefund`) that all follow the same pattern:

1. Fetch an order from the database
2. Fetch the associated user from the database
3. Call `calculateDiscount(user.tier, order.total)`
4. Return or persist results

The intended behavior assumes a complete, consistent data graph: every order has a valid `userId` that resolves to an existing user record. The crash occurs when that assumption breaks.

## 2. Data and Context Analysis

**Where the error actually occurs**: `user.tier` dereferences `null` because `db.users.findById(order.userId)` returned `null`.

**Why is `user` null?** The order exists (step 2 of the bug report confirms this), but the user it references does not. Possible causes:

- **User account was deleted** while their orders remain in the database (most likely -- this is common in systems without cascading deletes or soft-delete consistency)
- **Data migration issue** where `userId` was set incorrectly on some orders
- **Race condition** between user deletion and concurrent order lookups

**Why is it intermittent?** Most users exist. Only orders referencing deleted or missing users trigger the crash. The 12 tickets this week suggest a recent batch of user deletions or a data integrity issue.

**Critical observation**: The same unsafe dereference pattern exists in ALL THREE functions, not just `getOrderSummary`. `getOrdersByUser` and `processRefund` have the identical bug -- they will crash the same way when they encounter a missing user. Additionally, none of the functions check whether `db.orders.findById` returns null either.

## 3. Fix Scope: This Is NOT a Simple Null Check

### The bandaid temptation

The obvious "fix" is to add `if (!user) throw new Error("User not found")` or `if (!user) return null` at line 25. This is a bandaid because:

- It only fixes `getOrderSummary` while `getOrdersByUser` and `processRefund` have the same bug
- It treats the symptom (null dereference) rather than the disease (unsafe data access pattern repeated across the module)
- Adding scattered null checks deep in business logic is the "adding a nil/null check deep in a call chain" anti-pattern from the debug skill

### The real problem

The code has no data validation layer between database access and business logic. Every function independently fetches data and blindly trusts it exists. This is a structural issue -- the pattern is wrong, not just one line.

### The fix

1. **Validate all database lookups consistently** -- both `order` and `user` fetches must be checked in every function
2. **Use domain-specific errors** so callers can distinguish "order not found" from "user not found" (these have different implications for support and monitoring)
3. **Fix all three functions** -- not just the one that's crashing today

This is a straightforward structural fix. It does not require a refactor of the module architecture or new abstractions. The existing function signatures and return types remain the same for the success path. We just need to stop blindly dereferencing nullable database results across the entire module.

## 4. Ambiguity to Surface

One design decision worth noting: **what should happen when a user is missing?**

- **Option A: Throw a descriptive error** -- callers get `OrderNotFoundError` or `UserNotFoundError` with context. The order lookup fails explicitly. This is the right default for `getOrderSummary` and `processRefund` (you can't show a summary or issue a refund without knowing the discount).
- **Option B: Degrade gracefully** -- treat missing users as `free` tier (0% discount) and return results anyway. This keeps the system available but could silently produce wrong data.
- **Option C: Hybrid** -- throw for `processRefund` (money is involved), degrade for read-only `getOrderSummary`.

**Recommendation**: Option A. Throwing explicit errors is safest. A missing user is a data integrity problem that should be visible, not papered over. Callers (API handlers) can decide how to present this to end users. If graceful degradation is desired later, it should be an intentional product decision, not an accidental side effect of a bug fix.

## 5. Root Cause Summary

| Aspect | Finding |
|---|---|
| **Symptom** | `TypeError: Cannot read properties of null (reading 'tier')` |
| **Immediate cause** | `db.users.findById()` returns `null` for deleted/missing users |
| **Root cause** | No validation of database lookup results before use, repeated across all three functions |
| **Scope of impact** | All three public functions (`getOrderSummary`, `getOrdersByUser`, `processRefund`) have the same vulnerability |
| **Likely trigger** | User accounts deleted without cleaning up associated orders |
