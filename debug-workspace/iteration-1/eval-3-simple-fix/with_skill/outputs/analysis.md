# Debug Analysis: hasPrev returns true on page 1

## 1. Holistic View

The `paginate` function is a generic pagination helper that takes an array of items, a 1-based page number, and a page size. It returns a slice of items along with metadata including `hasNext` and `hasPrev` navigation booleans.

The intended behavior: page 1 is the first page. `hasPrev` should be false on page 1 because there is no page 0.

## 2. Data and Context

The function uses 1-based page indexing throughout:
- `start = (page - 1) * pageSize` -- subtracts 1 to convert to 0-based array index
- `hasNext: page < totalPages` -- correct, pages go from 1 to totalPages

The bug is on line 28:
```
hasPrev: page > 0,
```

Since pages are 1-indexed, page 1 is the first valid page. `page > 0` evaluates to `true` for page 1, incorrectly indicating there is a previous page. A consumer using this flag navigates to page 0, which produces `start = -1 * pageSize` (a negative slice index), returning an empty array.

## 3. Fix Scope

This is a straightforward off-by-one error. The condition should be `page > 1` to match the 1-based indexing used everywhere else in the function. Compare with `hasNext: page < totalPages` which is already correct.

No structural or architectural issue. No ambiguity to surface. Single-line fix.

## Root Cause

The `hasPrev` condition uses `page > 0` (0-based thinking) instead of `page > 1` (1-based thinking, consistent with the rest of the function).

## Fix

Change `hasPrev: page > 0` to `hasPrev: page > 1`.
