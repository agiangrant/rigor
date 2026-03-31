# Code Review: OrderService — Order Creation

## Critical Issues

### 1. Discount logic bug: 20% discount is always overridden by 10% (orderService.ts:15-16)

The discount conditions are missing an `else`. When `totalQuantity >= 50`, the first `if` correctly sets `discount = total * 0.20`, but then the second `if` (`totalQuantity >= 10`) also evaluates to true and overwrites it with `total * 0.10`. Customers ordering 50+ items get 10% instead of the intended 20%.

```ts
// Current (broken)
if (totalQuantity >= 50) discount = total * 0.20;
if (totalQuantity >= 10) discount = total * 0.10;

// Fix
if (totalQuantity >= 50) discount = total * 0.20;
else if (totalQuantity >= 10) discount = total * 0.10;
```

This is a real money bug -- every bulk order over 50 items is undercharged on the discount, or overcharged for the customer depending on perspective. Either way, wrong.

### 2. Duplicated discount logic — diverges from PricingService (orderService.ts:13-16)

`PricingService.calculateBulkDiscount` already implements this exact business rule and gets it right (it uses early returns, so the 50+ case is checked first and returned before the 10+ case runs). The copy in `OrderService` not only duplicates the logic but introduces the bug above.

`OrderService` should delegate to `PricingService.calculateBulkDiscount(total, totalQuantity)` instead of reimplementing the discount calculation. This eliminates the duplication and the bug simultaneously.

### 3. No null check on product lookup (orderService.ts:8-9)

If `db.products.findById` returns `null` for an unknown product ID, `product.price` will throw a `TypeError: Cannot read properties of null`. `PricingService` handles this case properly with a guard (`if (!product) throw new Error('Product not found')`). `OrderService` should do the same, or better yet, delegate to `PricingService.calculatePrice`.

### 4. No null check in getOrderTotal (orderService.ts:35)

`getOrderTotal` calls `order.total` without checking whether `db.orders.findById` returned `null`. This will produce an unhandled `TypeError` for any invalid order ID. Should throw a meaningful error like `"Order not found"`.

## Test Coverage Issues

### 5. Tests don't verify correctness — only existence

The single test asserts `expect(result).toBeDefined()` but never checks:
- Whether the calculated total is correct
- Whether `db.orders.create` was called with the right subtotal, discount, and total
- The mock for `db.orders.create` returns a hardcoded `{ total: 50 }` that has no relationship to the input, so the test would pass even if the calculation were completely wrong

### 6. Missing test cases

The test suite has one test covering only the no-discount path (quantity 5). There are no tests for:
- **Bulk discount at 10+ items** -- would catch the threshold behavior
- **Bulk discount at 50+ items** -- would catch the `if`/`else if` bug immediately
- **Multiple items in a single order** -- total quantity aggregation across line items
- **Product not found** -- error handling for invalid product IDs
- **`getOrderTotal` happy path** -- not tested at all
- **`getOrderTotal` with missing order** -- null dereference not tested
- **Zero or negative quantities** -- no input validation in OrderService
- **Empty items array** -- edge case, creates an order with total 0

## Minor Issues

### 7. No input validation

`OrderService.createOrder` does not validate its inputs. `PricingService` rejects `quantity <= 0`, but `OrderService` would happily create an order with negative quantities, producing negative totals. An empty `items` array would create a zero-dollar order.

### 8. No return type annotations

`createOrder` and `getOrderTotal` have no return type annotations. For a service that handles money, explicit types help catch mistakes at compile time.

## Summary

The most important fix is the discount bug (#1), ideally addressed by removing the duplicated logic and delegating to `PricingService` (#2). The null safety issues (#3, #4) are runtime crash risks. The test suite (#5, #6) needs substantial expansion -- in its current form it would not catch any of these bugs.
