# Bug Analysis: hasPrev returns true on page 1

## Root Cause

In `src/pagination.ts` line 28, the `hasPrev` condition is:

```ts
hasPrev: page > 0,
```

Pages are 1-indexed (the `start` offset is computed as `(page - 1) * pageSize`, confirming page 1 is the first valid page). The check `page > 0` evaluates to `true` when `page` is 1, incorrectly indicating there is a previous page. Navigating "back" from page 1 goes to page 0, which produces `start = -pageSize` and `Array.slice` returns an empty array.

## Fix

Change the comparison from `page > 0` to `page > 1`. This makes `hasPrev` false on page 1 (no previous page) and true on page 2+ (previous page exists).

## Impact

Single-character fix. No other code paths are affected -- `hasNext`, item slicing, and total-page calculation are all correct.
