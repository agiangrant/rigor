# Debug Analysis: TypeError on `user.tier` in getOrderSummary

## Step 1: Holistic View

The order service has three public functions (`getOrderSummary`, `getOrdersByUser`, `processRefund`) that all follow the same pattern:

1. Fetch an order from the database
2. Fetch the associated user from the database using `order.userId`
3. Call `calculateDiscount(user.tier, order.total)` to compute a discount
4. Return or act on the result

The entire module assumes that every `db.users.findById()` call returns a valid `User` object. There is no handling anywhere for the case where a user does not exist.

## Step 2: Data and Context Analysis

**Where the error appears**: Line 27 -- `calculateDiscount(user.tier, order.total)` throws because `user` is `null`.

**Where the bug actually lives**: Line 25 -- `db.users.findById(order.userId)` returns `null`, and nothing validates that result before using it. But even that is a symptom.

**Root cause**: The system has a data integrity problem. Orders exist that reference users who are no longer in the database. This could be caused by:
- User accounts being deleted without cascading to their orders
- Soft-delete on users that causes `findById` to return `null` for "deleted" users
- A race condition during account deletion
- Orphaned test/migration data

**Why it's intermittent**: Only orders whose associated user has been deleted (or never existed) trigger the crash. Most orders have valid users, so most requests succeed.

**Scope of the vulnerability**: All three functions (`getOrderSummary`, `getOrdersByUser`, `processRefund`) have the identical bug. The bug report only mentions `getOrderSummary`, but `processRefund` is arguably worse -- it would silently fail to process a refund, or crash mid-refund leaving the system in an inconsistent state.

Additionally, `getOrderSummary` and `processRefund` also don't check whether `order` itself is null (what if `orderId` is invalid?). `getOrdersByUser` doesn't check whether the user is null either. The null-safety problem is systemic.

## Step 3: Fix Scope Assessment

This is NOT a straightforward fix. Evidence:

- **Same pattern repeated 3 times**: The "fetch and assume non-null" pattern is in every function. A point fix on `getOrderSummary` alone would leave `processRefund` as a ticking time bomb.
- **The fix should not suppress the error**: Adding `if (!user) return null` is a bandaid. The caller would get a silent `null` with no understanding of why.
- **Root cause is upstream**: The real question is why orphaned orders exist. The fix needs to handle the data integrity gap explicitly, not paper over it.
- **A refund on an orphaned order is a financial correctness issue**: This isn't just a UI inconvenience.

## Step 4: Options

### Option A: Defensive Validation with Explicit Errors (Recommended)

Add validation after every database lookup. When an expected entity is missing, throw a descriptive domain error (not a generic TypeError). Apply this consistently to all three functions.

```typescript
const user = await db.users.findById(order.userId);
if (!user) {
  throw new OrderServiceError(`User ${order.userId} not found for order ${orderId}`);
}
```

**Trade-offs**:
- (+) Immediate fix for the production crashes across all three functions
- (+) Errors become diagnosable -- support can see *which* user is missing, not just a generic TypeError
- (+) Low risk, minimal code change, no structural rework needed
- (+) Makes the implicit assumption explicit -- if a user must exist, say so
- (-) Does not prevent orphaned orders from being created in the first place
- (-) Callers still get errors, just better ones

### Option B: Handle Missing Users as a Valid State

Treat a missing user as a legitimate scenario. When the user is missing, apply no discount (free tier behavior) and mark the response accordingly.

```typescript
const user = await db.users.findById(order.userId);
const tier = user?.tier ?? 'free';
const discount = calculateDiscount(tier, order.total);
```

**Trade-offs**:
- (+) Orders always return a result -- no more crashes
- (+) Graceful degradation
- (-) Masks a data integrity problem -- you stop getting alerts about orphaned orders
- (-) Wrong for refunds: silently refunding at full price (no discount) when the user was actually enterprise tier means refunding too little
- (-) "Default to free" is a business decision being made silently in code

### Option C: Fix Data Integrity at the Source

Add foreign key constraints or deletion hooks to ensure orders cannot reference non-existent users. Clean up existing orphaned data. Then add defensive checks as a safety net.

**Trade-offs**:
- (+) Fixes the actual root cause
- (+) Prevents future occurrences
- (-) Requires database migration and possibly a data cleanup script
- (-) Larger scope -- needs coordination across teams
- (-) Doesn't fix the immediate production pain

## Recommendation

**Option A now, Option C as follow-up work.**

Option A stops the bleeding immediately. The production crashes stop, support gets actionable error messages, and all three vulnerable functions are hardened. Option C should be filed as follow-up work to prevent orphaned orders from being created in the first place.

Option B is explicitly not recommended. Silently defaulting a missing user to "free" tier is a business logic decision that should not be buried in error handling code, and it's actively wrong for the refund path.

## Proposed Fix Summary

1. Add a custom error class `OrderServiceError` for domain-level failures
2. Validate `order` and `user` after every database fetch in all three functions
3. Throw descriptive errors that include the entity IDs for debuggability
4. Write regression tests covering the null-user case for all three functions
