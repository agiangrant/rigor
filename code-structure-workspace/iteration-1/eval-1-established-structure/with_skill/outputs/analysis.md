# Structural Analysis: Adding Payments Feature

## Step 1: Scan the Existing Structure

### Directory Layout

```
src/
  __tests__/
    routes/
      userRoutes.test.ts
      productRoutes.test.ts
  middleware/          (empty)
  models/
    order.ts
    product.ts
    user.ts
  routes/
    index.ts           (barrel export)
    orderRoutes.ts
    productRoutes.ts
    userRoutes.ts
  services/
    orderService.ts
    productService.ts
    userService.ts
```

### Organizational Pattern

**Layer-based architecture.** Code is organized by technical layer (models, services, routes, tests), not by feature/domain. Each entity (user, product, order) has one file per layer.

### Naming Conventions

- **Models**: singular, lowercase camelCase: `user.ts`, `order.ts`, `product.ts`
- **Services**: camelCase with `Service` suffix: `userService.ts`, `orderService.ts`
- **Routes**: camelCase with `Routes` suffix: `userRoutes.ts`, `orderRoutes.ts`
- **Tests**: mirror the source path under `__tests__/`: `__tests__/routes/userRoutes.test.ts`
- **Exports**: models export an interface, services export a class with static methods, routes export a named `router as {entity}Routes`
- **Barrel file**: `routes/index.ts` re-exports all route modules

### Internal File Patterns

- **Routes** import from `../services/{entity}Service`, create a `Router()`, define handlers, export as `{ router as {entity}Routes }`
- **Services** import from `../models/{entity}`, use a class with static async methods, return stub data
- **Models** export a single TypeScript interface
- **Tests** use vitest (`describe`, `it`, `expect`)

### Structure Documentation

No README, ARCHITECTURE.md, or similar found. Conventions are inferred from the code.

## Step 2: Classify the Change

**Adding to an established location.** The project already has three entities (user, product, order), each following the identical pattern across all layers. A "payments" feature is the same kind of entity -- it needs a model, a service, routes, and a test. Every destination directory already exists and contains neighbors that demonstrate the exact pattern to follow.

This is the simple case. Proceed to Step 3.

## Step 3: Follow the Established Structure

### Files to Create

| File | Rationale |
|------|-----------|
| `src/models/payment.ts` | Follows `order.ts`, `user.ts`, `product.ts` -- singular name, exports interface |
| `src/services/paymentService.ts` | Follows `orderService.ts`, `userService.ts` -- class with static methods |
| `src/routes/paymentRoutes.ts` | Follows `orderRoutes.ts`, `userRoutes.ts` -- Router with handlers |
| `src/__tests__/routes/paymentRoutes.test.ts` | Follows `userRoutes.test.ts`, `productRoutes.test.ts` |

### Barrel File Update

`src/routes/index.ts` must be updated to add `export { paymentRoutes } from './paymentRoutes';`

### Placement Decisions

No ambiguity. Every file goes into an existing directory, follows an existing naming convention, and mirrors the structure of at least two existing neighbors. No new directories needed. No step 4 surfacing required.
