# Analysis: TypeError on null user tier in getOrderSummary

## Symptom

`TypeError: Cannot read properties of null (reading 'tier')` thrown intermittently in `getOrderSummary`. 12 customer support tickets this week.

## Root Cause

`db.users.findById(order.userId)` returns `null` for some orders. The code then immediately accesses `user.tier` without checking whether `user` exists.

This means there are orders in the database whose `userId` references a user that no longer exists (or never existed). This is a **data integrity problem** -- the orders table contains dangling foreign keys pointing to missing users.

Possible upstream causes:
- Users were hard-deleted without cascading to their orders
- A race condition during user account deletion allows orders to be created/retained after the user row is removed
- Orders were created with an invalid `userId` due to a bug in order creation

## Why a null guard is NOT the right fix

The tempting fix is:

```ts
if (!user) return someDefault;
// or
const tier = user?.tier ?? 'free';
```

This silences the error but **hides the data integrity problem**. Orders with missing users would silently get zero discount, potentially undercharging enterprise customers or producing incorrect refunds. The 12 support tickets would stop, but the underlying issue would continue to corrupt business logic silently.

## Correct fix

1. **Throw a clear, specific error** when `user` is null -- replace a confusing TypeError with a domain error that identifies the exact problem (order references a nonexistent user).
2. **Apply the same guard in all three functions** (`getOrderSummary`, `getOrdersByUser`, `processRefund`) since they all have the same vulnerability.
3. **Apply null checks on `order` too** -- `db.orders.findById` can also return null for a missing order, and the code dereferences `order.userId` without checking.

The real long-term fix is upstream: ensure users cannot be deleted while they have active orders, or soft-delete users instead of hard-deleting. But the immediate code fix should make the failure mode explicit and debuggable rather than silent.

## Scope of the bug

All three exported functions -- `getOrderSummary`, `getOrdersByUser`, and `processRefund` -- have the same pattern of unchecked null dereference on both `order` and `user`. The fix must cover all three.
