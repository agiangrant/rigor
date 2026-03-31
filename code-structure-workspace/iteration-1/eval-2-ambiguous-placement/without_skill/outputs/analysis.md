# Audit Logging System -- Placement Analysis

## Current Architecture

The project follows a feature-based structure with shared infrastructure:

```
src/
  features/
    auth/          -- AuthService, authMiddleware
    billing/       -- BillingService
    notifications/ -- NotificationService
  shared/
    db/            -- database client
    email/         -- email sender
    types/         -- shared interfaces
```

The pattern is clear: **feature-specific logic lives in `features/`**, while **cross-cutting infrastructure lives in `shared/`**.

## Where Should Audit Logging Live?

**Decision: `src/shared/audit/`**

Audit logging is cross-cutting infrastructure, not a feature. It spans auth, billing, and notifications equally -- placing it inside any single feature would create a wrong dependency direction. It follows the same pattern as `shared/db/` (persistence) and `shared/email/` (communication): infrastructure that multiple features consume.

### Options Considered

| Option | Verdict |
|--------|---------|
| `shared/audit/` | **Chosen.** Matches existing cross-cutting infra pattern (`db/`, `email/`). Every feature imports it the same way they import db and email. |
| `features/audit/` | Rejected. Audit logging is not a user-facing feature. It has no routes, no service boundary of its own. Making it a feature implies parity with auth/billing/notifications, which is misleading. |
| Inline in each service | Rejected. Duplicates logic, makes audit format inconsistent, makes it impossible to change audit storage in one place. |
| Middleware-only approach | Rejected. Middleware can capture HTTP-level actions but not service-level actions like `processPayment` or internal calls. We need logging at the service layer. |

## Implementation Approach

1. **`src/shared/audit/logger.ts`** -- A single `AuditLogger` with a `log()` method that records actor, action, resource, and timestamp. Writes to the existing db client (new `auditLogs` collection).
2. **`src/shared/types/index.ts`** -- Add an `AuditEntry` interface to the shared types.
3. **Each service** gets `AuditLogger.log()` calls at the point of action, not in middleware. This ensures every service action is captured regardless of how it's invoked (HTTP, cron, queue, etc.).

The db client gets a new `auditLogs` collection following the existing stub pattern.

## Files Created/Modified

- `src/shared/types/index.ts` -- added `AuditEntry` interface
- `src/shared/audit/logger.ts` -- new audit logger module
- `src/shared/db/client.ts` -- added `auditLogs` collection
- `src/features/auth/authService.ts` -- added audit logging to login, register, resetPassword
- `src/features/billing/billingService.ts` -- added audit logging to createInvoice, processPayment
- `src/features/notifications/notificationService.ts` -- added audit logging to notify
