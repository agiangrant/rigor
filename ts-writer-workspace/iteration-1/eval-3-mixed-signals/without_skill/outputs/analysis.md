# Analysis: Adding a Commenting System

## Task

Add a commenting system where users can add comments to any resource, edit their own comments, and delete their own comments. Comments have a body, authorId, resourceId, and timestamps.

## Existing Codebase Observations

### Architecture Pattern
- **Schema layer** (Zod): Validates request input. Exports inferred types.
- **Service layer**: Business logic. Talks to `db` directly. Returns domain objects or null.
- **Handler layer**: Express request/response. Parses input via schema, delegates to service, formats HTTP responses. Catches `ZodError` inline.
- **Middleware**: Global error handler for `ZodError` and 500s.
- **DB**: Stub module with async methods returning mock data. Already has a `comments` namespace with `create`, `findByResource`, `findById`, `update`, `delete`.
- **Tests**: Vitest with `vi.mock('../db')`, mock the db layer, test service methods.

### Mixed Signals / Tensions in the Codebase

1. **Error handling duplication**: The handler catches `ZodError` inline (`userHandler.ts` lines 13-16), but there's also a global `errorHandler` middleware that does the same thing. The comment handler should pick one approach. I'll follow the existing handler pattern (inline catch) for consistency with `userHandler`, since the global middleware would only catch errors that bubble up via `next()`.

2. **DB layer already has comments**: `db.ts` already defines `db.comments` with CRUD methods. This is a strong signal — the db layer is ready, we just need schema + service + handler + tests.

3. **No ownership enforcement pattern exists**: The user service has no authorization checks. The task requires "edit their own / delete their own" — this is an authorization concern. The comment service must check `authorId` matches the requesting user. I'll assume the `authorId` of the caller is passed in (e.g., from auth middleware) rather than inventing an auth system.

4. **Timestamps**: The user service adds `createdAt` at create time. Comments should have both `createdAt` and `updatedAt`.

5. **Response format**: Uses `{ data: ... }` for success, `{ error: ... }` for failures.

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Ownership check location | Service layer | Business logic belongs in service, not handler |
| authorId source | `req.body` for create, `req.headers['x-user-id']` or param for edit/delete | No auth middleware exists; keep it simple, pass authorId in body for create and use a header or param for mutation authorization |
| Error for unauthorized edit/delete | 403 Forbidden | Standard HTTP semantics |
| Error for missing comment | 404 Not Found | Consistent with user handler |
| Inline vs middleware error handling | Inline ZodError catch in handler | Matches existing userHandler pattern |
| updatedAt on create | Set to same value as createdAt | Common convention |

## Implementation Plan

1. **`src/schemas/commentSchema.ts`** — Zod schemas for create and update, plus inferred types
2. **`src/services/commentService.ts`** — CommentService class with create, getByResource, update, delete (with ownership checks)
3. **`src/handlers/commentHandler.ts`** — Express handlers for CRUD operations
4. **`src/__tests__/commentService.test.ts`** — Unit tests for the service layer

## Files Created

- `src/schemas/commentSchema.ts`
- `src/services/commentService.ts`
- `src/handlers/commentHandler.ts`
- `src/__tests__/commentService.test.ts`
