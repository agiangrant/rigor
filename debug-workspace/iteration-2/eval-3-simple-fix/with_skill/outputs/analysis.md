# Debug Analysis: hasPrev returns true on page 1

## Step 1: Holistic View

The `paginate` function is a generic utility that slices an array into pages and returns navigation metadata. Pages are 1-based, as shown by the offset calculation `start = (page - 1) * pageSize`. The function returns `hasNext` and `hasPrev` booleans that UI consumers use to enable/disable navigation buttons.

## Step 2: Data and Context

- **Data source**: The `items` array passed directly to the function. The data itself is fine -- the bug is in metadata computation.
- **Execution context**: A pure utility function with no side effects or external dependencies. Callers rely on `hasPrev` to decide whether to render/enable a "Previous" button.
- **State**: On page 1, `hasPrev` evaluates `page > 0`, which is `1 > 0 === true`. This incorrectly signals that a previous page exists.

## Step 3: Fix Scope

This is a straightforward off-by-one error. The boundary condition uses `> 0` when it should use `> 1`, since pages are 1-based. No structural issues, no ambiguity, no deeper design problem.

## Root Cause

Line 28 of `src/pagination.ts`:

```ts
hasPrev: page > 0,
```

Since the minimum valid page is 1, `hasPrev` should only be true when `page > 1`. The current condition `page > 0` is off by one.

## Fix

Change `page > 0` to `page > 1`.

## Verification

The fix is consistent with the rest of the function:
- `hasNext: page < totalPages` is correct (on the last page, `page === totalPages`, so `hasNext` is false).
- `hasPrev: page > 1` mirrors this correctly (on the first page, `page === 1`, so `hasPrev` is false).

No other callers or downstream behavior is affected -- the function is a pure computation with no side effects.
