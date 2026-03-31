# Code Review: OrderService — Order Creation

## Context

This PR adds order creation to the e-commerce service via `OrderService`. The service creates orders by looking up product prices, calculating totals, applying bulk discounts, and persisting the order. A `getOrderTotal` method is also included for retrieving an order's total by ID.

The codebase already has a `PricingService` that encapsulates pricing and discount logic. The new `OrderService` duplicates part of that logic inline rather than reusing it.

Scope: New feature (two methods, one test file).

---

## Blocking

### 1. Discount logic bug: >= 50 quantity discount is silently overridden by >= 10 branch

**What**: In `orderService.ts` lines 15-16, the two `if` statements are not mutually exclusive:

```ts
if (totalQuantity >= 50) discount = total * 0.20;
if (totalQuantity >= 10) discount = total * 0.10;
```

When `totalQuantity >= 50`, both conditions are true. The second `if` overwrites the 20% discount with 10%. A customer ordering 50+ items gets a *smaller* discount than intended.

**Why**: This is a correctness bug that directly affects revenue and customer trust. Orders with 50+ items will be overcharged relative to the business rule, or (depending on perspective) the 20% tier is entirely unreachable, making it dead code.

**How**: Either use `else if`, or reorder the conditions to check the smaller threshold first with `else if` for the larger one, or -- better -- delegate to `PricingService.calculateBulkDiscount()` which already implements this correctly (see finding #3).

### 2. No null check on product lookup in `createOrder`

**What**: `orderService.ts` line 8-9 calls `db.products.findById(item.productId)` and immediately accesses `product.price` without checking whether `product` is null or undefined.

**Why**: If a non-existent `productId` is passed, this will throw an unhandled `TypeError: Cannot read properties of null (reading 'price')`. That error message is opaque -- it gives no indication of which product was missing. In contrast, `PricingService.calculatePrice` already handles this with a clear error. An unhandled crash here could also leave the system in an inconsistent state if any preceding work had side effects.

**How**: Check for a null/missing product and throw a descriptive error:
```ts
const product = await db.products.findById(item.productId);
if (!product) throw new Error(`Product not found: ${item.productId}`);
```

### 3. No null check on order lookup in `getOrderTotal`

**What**: `orderService.ts` line 34-35 calls `db.orders.findById(orderId)` and accesses `order.total` without checking whether the order exists.

**Why**: Same class of problem as #2. A missing order produces a cryptic `TypeError` instead of a meaningful error. This is the kind of failure that is difficult to diagnose in production logs.

**How**: Add a null check:
```ts
const order = await db.orders.findById(orderId);
if (!order) throw new Error(`Order not found: ${orderId}`);
return order.total;
```

### 4. Test asserts nothing meaningful

**What**: The only test in `orderService.test.ts` (line 20-21) asserts:

```ts
expect(result).toBeDefined();
```

This proves the function returned *something*. It does not verify the total, the discount, the items, or any other property of the created order.

Furthermore, `db.orders.create` is mocked to return `{ id: 'o1', total: 50 }`, which means the test is asserting that a hardcoded mock return value is defined. It is not testing the service's calculation logic at all.

**Why**: This test provides zero regression protection. The discount bug (finding #1) would never be caught by this test. A test suite that only confirms "a value was returned" is a false sense of security.

**How**: Let the mock for `db.orders.create` pass through its input (or capture it), then assert against the computed `subtotal`, `discount`, and `total` values. For example:

```ts
let capturedOrder: any;
vi.mocked(db.orders.create).mockImplementation(async (data) => {
  capturedOrder = { id: 'o1', ...data };
  return capturedOrder;
});

const result = await service.createOrder('u1', [
  { productId: 'p1', quantity: 5 },
]);

expect(capturedOrder.subtotal).toBe(50);
expect(capturedOrder.discount).toBe(0);
expect(capturedOrder.total).toBe(50);
```

---

## Should Fix

### 5. Duplicated discount logic -- use PricingService instead

**What**: `orderService.ts` lines 13-16 re-implement the bulk discount calculation that already exists in `PricingService.calculateBulkDiscount()` (pricingService.ts lines 11-16). The comment on line 12 even acknowledges this: *"copied from pricing service but with 'improvements'"*.

**Why**: This is the textbook case of duplicated domain logic that will drift. It has *already* drifted -- the copy has a bug that the original does not. Discount thresholds, percentages, or new tiers will need to be updated in two places. One will inevitably be missed.

**How**: Inject or instantiate `PricingService` and call `calculateBulkDiscount(total, totalQuantity)`. The OrderService should not own discount logic -- that is the PricingService's responsibility.

### 6. No validation of the `items` array

**What**: `createOrder` does not validate that `items` is non-empty, that quantities are positive, or that there are no duplicate `productId` entries.

**Why**: An empty `items` array creates a zero-total order with no line items. A negative quantity produces a negative total. These are silent data corruption issues that will surface downstream (invoicing, fulfillment, reporting).

**How**: Validate at the top of `createOrder`:
```ts
if (!items.length) throw new Error('Order must have at least one item');
for (const item of items) {
  if (item.quantity <= 0) throw new Error('Quantity must be positive');
}
```

### 7. Missing tests for discount tiers, error paths, and `getOrderTotal`

**What**: The test file has a single test covering one happy path (5 items, no discount). There are no tests for:
- The 10+ quantity discount tier
- The 50+ quantity discount tier (which would catch the bug in finding #1)
- Non-existent product IDs
- Empty items array
- `getOrderTotal` with a valid order
- `getOrderTotal` with a non-existent order

**Why**: Every untested code path is a path where bugs hide undetected. The discount tiers are core business logic and must have dedicated tests. The error paths are how the service fails in production -- untested failure modes produce surprising behavior.

**How**: Add tests for each of the scenarios listed above. At minimum: no-discount case with correct value assertions, 10+ quantity discount, 50+ quantity discount, missing product error, empty items error, and both success/failure cases for `getOrderTotal`.

---

## Consider

### 8. Sequential product lookups could be parallelized

**What**: `orderService.ts` lines 7-9 await each `db.products.findById` call sequentially in a `for...of` loop.

**Why**: For orders with many distinct products, this creates N sequential database round-trips. If product lookups average 10ms each, a 20-item order takes 200ms in serial versus ~10ms with `Promise.all`.

**How**: Collect the product lookup promises and resolve them in parallel:
```ts
const products = await Promise.all(
  items.map(item => db.products.findById(item.productId))
);
```

This is a performance consideration, not a correctness issue. If the database connection pool is constrained, sequential may actually be preferred -- but it should be a conscious choice.

### 9. No `userId` validation

**What**: There is no check that `userId` is a valid, existing user before creating the order.

**Why**: This could result in orphaned orders that cannot be associated with a user. Whether this matters depends on whether the calling layer already validates the user -- if it does, this is fine. If `createOrder` can be called from multiple entry points, it should validate independently.

**How**: Either validate `userId` against the database or document the precondition that the caller is responsible for user validation.
