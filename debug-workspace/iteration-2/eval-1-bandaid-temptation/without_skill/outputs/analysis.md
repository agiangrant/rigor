# Bug Analysis: TypeError on null user tier

## Symptom

`TypeError: Cannot read properties of null (reading 'tier')` in `getOrderSummary`, intermittent, 12 support tickets this week.

## Root Cause

`db.users.findById()` returns `null` when a user is not found, and every caller dereferences the result without a null check. The code on line 25-27 of `orderService.ts`:

```ts
const user = await db.users.findById(order.userId);
const discount = calculateDiscount(user.tier, order.total);
```

When `user` is `null`, accessing `user.tier` throws.

## Why It's Intermittent

Not every order has this problem -- only orders whose `userId` references a user that no longer exists (or never existed) in the database. Likely causes:

- **Deleted users**: Users were removed from the users table but their orders remain (no cascading delete or soft-delete).
- **Data inconsistency**: A race condition during user creation -- order was placed, but user record write failed or was rolled back.
- **Bad data migration**: A migration or import left orphaned orders pointing to nonexistent user IDs.

The intermittent nature is the key signal: this is a **data integrity problem**, not a code logic problem. The real bug is that orphaned orders exist, and the code assumes referential integrity that the database doesn't enforce.

## Why a Null Guard Is Not the Fix

The tempting fix is:

```ts
if (!user) return { error: 'User not found' };
```

This silences the error but:
1. It hides the data integrity issue -- orphaned orders keep accumulating silently.
2. Every function that calls `db.users.findById` has the same vulnerability (`getOrdersByUser`, `processRefund`). You'd need guards in all three plus any future callers.
3. Customers still can't see their orders -- the symptom changes from a crash to a silent failure.

## Correct Fix

1. **Validate at the data access boundary**: Create a helper that wraps `findById` and throws a descriptive domain error (not a raw TypeError) when the entity is missing. This centralizes the null check rather than sprinkling guards across every call site.
2. **Apply to all three functions**: `getOrderSummary`, `getOrdersByUser`, and `processRefund` all have the identical pattern of unguarded `findById` calls -- for both orders and users.
3. **Fix the data layer**: Investigate why orphaned orders exist. Add a foreign key constraint or equivalent referential integrity check to prevent future orphans. Clean up existing orphaned records.

## Scope of the Problem

The same unguarded pattern appears in all three exported functions. Additionally, `db.orders.findById` is also called without a null check (line 24, 60), meaning a nonexistent `orderId` would produce a similar TypeError on `order.userId`. The fix should cover both lookup types.

## Affected Functions

| Function | Unguarded `orders.findById` | Unguarded `users.findById` |
|---|---|---|
| `getOrderSummary` | line 24 | line 25 |
| `getOrdersByUser` | -- | line 45 |
| `processRefund` | line 60 | line 61 |
