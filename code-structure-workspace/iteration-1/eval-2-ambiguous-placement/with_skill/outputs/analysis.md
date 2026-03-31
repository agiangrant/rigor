# Audit Logging System — Structural Analysis

## What We're Adding

An audit logging system that tracks who did what and when across all features (auth, billing, notifications). Every service action should be logged. This is cross-cutting infrastructure that will be imported by every feature module.

## Existing Structure

```
src/
  config/                  # empty
  features/
    auth/
      authService.ts
      authMiddleware.ts
    billing/
      billingService.ts
    notifications/
      notificationService.ts
  shared/
    db/
      client.ts
    email/
      sender.ts
    types/
      index.ts
```

**Organizational pattern:** Hybrid — feature-based modules under `features/`, cross-cutting infrastructure under `shared/`.

**Naming conventions:** camelCase filenames, PascalCase classes, feature directories are plural nouns, shared directories are singular nouns describing the capability (db, email, types).

**Import pattern:** Features import from `shared/` via relative paths. Features do not import from each other.

## Classification

This is **ambiguous placement**. Audit logging has characteristics of both a shared infrastructure concern and a standalone feature:

- Like `shared/email/` and `shared/db/`, it is consumed by all features and provides a utility capability.
- Unlike those, audit logging has its own domain concepts (audit entries, actors, actions, retention policies) and could grow into a significant subsystem with its own API endpoints, query interfaces, or admin views.

Two viable placements exist, and the choice depends on how you see this system evolving.

## Option A: `src/shared/audit/`

```
src/shared/audit/
  logger.ts          # auditLog() function, analogous to sendEmail() or db client
```

**Why it makes sense:**
- Follows the exact pattern of `shared/email/sender.ts` and `shared/db/client.ts` — a utility consumed by all features
- Every feature imports it the same way they import `db` and `sendEmail`
- Keeps `features/` reserved for user-facing product domains
- Minimal structural footprint — one directory, one file

**Trade-offs:**
- If audit logging grows (query APIs, admin views, retention jobs), `shared/` becomes overloaded with domain logic that doesn't belong there
- Would need to be moved later if it evolves beyond a simple logging utility

## Option B: `src/features/audit/`

```
src/features/audit/
  auditService.ts    # AuditService class, analogous to AuthService/BillingService
```

**Why it makes sense:**
- Follows the naming and structure pattern of existing features (PascalCase service class, camelCase filename)
- Gives audit logging room to grow — query endpoints, admin dashboard, retention policies can all live here
- Treats audit as a first-class domain, not just plumbing

**Trade-offs:**
- Breaks the current pattern where features don't import from each other — auth, billing, and notifications would all import from `features/audit/`
- Every other feature directory is a user-facing product domain; audit is infrastructure that serves those domains
- May signal that `features/` is the catch-all for "any module," weakening the organizational clarity

## Recommendation

**Option A (`src/shared/audit/`)** is the better fit for the current codebase. The project has a clear separation: `shared/` holds cross-cutting infrastructure that features depend on, and `features/` holds product domains. Audit logging is functionally identical to the email sender — a utility that every feature calls. Starting in `shared/` follows the existing pattern, and if the audit system later grows into its own domain with APIs and views, that's the right time to promote it to `features/`.

However, this is an architectural decision that could reasonably go either way. **The human should decide.**

## Action Required

Please confirm one of:
- **Option A** — `src/shared/audit/logger.ts`
- **Option B** — `src/features/audit/auditService.ts`

No implementation files have been created. Once placement is confirmed, the code will follow the conventions of whichever location is chosen.
