# Analysis: Commenting System

## Patterns Identified

| Pattern | Codebase Convention | Comment System Will Follow |
|---|---|---|
| **Error handling** | Handlers catch `ZodError` -> 400; rethrow others to `errorHandler` middleware -> 500. Services don't catch. | Same — validate in handler, let service errors propagate. |
| **Validation** | Zod schemas in `schemas/` directory, `z.infer` for input types, `*Schema` / `*Input` naming. | Same — `createCommentSchema`, `updateCommentSchema`, `CreateCommentInput`, `UpdateCommentInput`. |
| **Data modeling** | Domain interfaces defined in service files (not shared types dir). | `Comment` interface in `commentService.ts`. |
| **Service layer** | Classes with async methods. Module-level db import. No DI constructor. | `CommentService` class, same style. |
| **Handler layer** | Standalone async functions with `handle*` prefix. Service instantiated at module level. Schema parsed in handler. | `handleCreateComment`, `handleGetComments`, `handleUpdateComment`, `handleDeleteComment`. |
| **Response format** | `{ data: ... }` for success, `{ error: ... }` for failures. 201 for create, 200 for get, 404 for not found, 400 for validation. | Same. |
| **Testing** | vitest, `vi.mock('../db')`, test at service layer, `describe`/`it` blocks, `beforeEach(() => vi.clearAllMocks())`. | Same pattern, test `CommentService`. |
| **DB layer** | `db.comments` already exists with `create`, `findByResource`, `findById`, `update`, `delete`. | Use existing `db.comments` methods directly. |
| **Module structure** | `schemas/`, `services/`, `handlers/`, `__tests__/` | `commentSchema.ts`, `commentService.ts`, `commentHandler.ts`, `commentService.test.ts` |

## Pattern Decision: Authorization (Needs Human Input)

The task says "edit their own comments" and "delete their own comments." The existing codebase has NO authorization pattern — `handleGetUser` reads `req.params.id` but there is no concept of "the currently authenticated user" (no `req.user`, no auth middleware, no session).

**This is a pattern decision that needs to be surfaced.**

### Option A: Assume `authorId` comes from request body/params (no auth)

The handler takes `authorId` from the request body (for create) and checks ownership by comparing the comment's `authorId` against a provided `authorId` param. No actual auth — just ownership checking at the service level.

```typescript
// Create: authorId in body
const input = createCommentSchema.parse(req.body); // includes authorId

// Update/Delete: authorId from params or body, compared against comment.authorId
const comment = await commentService.getById(req.params.id);
if (comment.authorId !== req.body.authorId) -> 403
```

**Trade-offs:**
- Matches current project complexity (no auth infra exists)
- Simple, testable
- Not secure in production — anyone can claim any authorId
- Easy to layer real auth on top later (replace `req.body.authorId` with `req.user.id`)

### Option B: Assume `req.user.id` exists (pretend auth middleware exists)

The handler reads `req.user.id` as the authenticated user, even though no auth middleware exists yet. Type-assert or extend the Request type.

```typescript
// Extend Express Request
const userId = (req as AuthenticatedRequest).user.id;
```

**Trade-offs:**
- More realistic pattern for production
- Introduces a type that doesn't exist yet — requires new interface/type augmentation
- No existing pattern in codebase for this
- Couples to an auth system that doesn't exist

### Recommendation

**Option A.** The codebase has zero auth infrastructure. Introducing `req.user` creates a dependency on something that doesn't exist and establishes a pattern (Request type augmentation) with no precedent here. Option A keeps ownership logic testable and explicit, and is trivial to upgrade when auth arrives.

**Awaiting confirmation on this decision before writing implementation code.**
