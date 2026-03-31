# Bug Analysis: hasPrev returns true on page 1

## Root Cause

In `src/pagination.ts` line 28, the `hasPrev` condition uses an off-by-one comparison:

```ts
hasPrev: page > 0,
```

Pages are 1-indexed (the `start` offset on line 18 uses `(page - 1) * pageSize`, confirming page 1 is the first page). Therefore `page > 0` evaluates to `true` when `page` is 1, incorrectly signaling that a previous page exists. Navigating "back" from page 1 goes to page 0, where `(0 - 1) * pageSize` produces a negative start index, and `Array.slice` returns an empty array.

## Fix

Change the comparison from `page > 0` to `page > 1`. This makes `hasPrev` false on page 1 (the first page) and true on page 2+, which matches the 1-indexed pagination scheme.

## Impact

Single-character fix. No other code paths are affected -- `hasNext`, `totalPages`, and the slicing logic are all correct.
