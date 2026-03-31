# Analysis: Adding Payments Feature

## Observed Project Patterns

### Directory Structure
```
src/
  models/       — Single-line interface exports (e.g., `export interface Order { ... }`)
  services/     — Static async methods on a class, imported model type (e.g., `OrderService`)
  routes/       — Express Router, imports service, named export as `{name}Routes`
  routes/index.ts — Re-exports all route modules
  __tests__/routes/ — Vitest test files per route module
```

### Conventions
- **Models**: One interface per file, single-line, exported directly.
- **Services**: One class per file with static async methods. Stub implementations (return `[]`, `null`, or the input data).
- **Routes**: `Router()` instance, handlers are `async (req, res) => { ... }`, status 201 for creation, named export pattern `export { router as xRoutes }`.
- **Route index**: Barrel file re-exporting all route modules.
- **Tests**: Vitest, placeholder assertions (`expect(true).toBe(true)`).

## Files to Create

| File | Purpose |
|------|---------|
| `src/models/payment.ts` | `Payment` interface |
| `src/services/paymentService.ts` | `PaymentService` class with `create` and `listByUser` |
| `src/routes/paymentRoutes.ts` | POST `/payments` and GET `/payments` (filtered by `userId` query param) |
| `src/__tests__/routes/paymentRoutes.test.ts` | Placeholder test for payment routes |

## Files to Modify (noted but not modified in original project)

| File | Change |
|------|--------|
| `src/routes/index.ts` | Add `export { paymentRoutes } from './paymentRoutes'` |

The updated `index.ts` is included in outputs to show the intended change.
