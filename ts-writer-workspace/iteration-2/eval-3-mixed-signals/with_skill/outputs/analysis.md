# Comment System — Pattern Analysis

## Established Patterns (will follow directly)

| Pattern | Codebase Convention | How Comments Will Follow |
|---|---|---|
| **Validation** | Zod schemas with `z.infer` for input types | Zod schemas for create/update comment input |
| **Service layer** | Classes with async methods, domain interface defined in service file | `CommentService` class, `Comment` interface in service |
| **Handler layer** | Standalone async functions, `handle` prefix, ZodError catch in handler | `handleCreateComment`, `handleGetComments`, etc. |
| **DB mocking** | `vi.mock('../db')`, `vi.mocked(db.x.y).mockResolvedValue(...)` | Same mock pattern for `db.comments.*` |
| **Response format** | `{ data: ... }` for success, `{ error: ... }` for errors | Same envelope |
| **Error handling in handlers** | ZodError -> 400, not-found -> 404 early return, re-throw others | Same pattern, plus 403 for authorization failures |
| **Naming** | camelCase functions, PascalCase types, verb-first handlers | Matching |
| **Module instantiation** | `const userService = new UserService()` at module level in handler | `const commentService = new CommentService()` |

## Pattern Decision Requiring Human Input

### 1. `resourceId` Polymorphism

The task says "users can add comments to **any resource**." The codebase currently only has users. `resourceId: string` is an untyped polymorphic reference — it could point to a user, a future document, a future project, etc.

**Option A: Plain `resourceId: string`**
```typescript
// schema
resourceId: z.string().min(1)

// Comment interface
interface Comment {
  id: string;
  body: string;
  authorId: string;
  resourceId: string;
  createdAt: Date;
  updatedAt: Date;
}
```
- Matches the simplicity level of the existing codebase (no polymorphic patterns exist yet)
- No type safety on what `resourceId` refers to — any string is valid
- Easy to extend later but no compile-time protection
- Fits YAGNI — only one resource type exists today

**Option B: Discriminated `resourceType` + `resourceId`**
```typescript
// schema
resourceType: z.enum(['user']),  // extend as resources are added
resourceId: z.string().min(1),

// Comment interface
interface Comment {
  id: string;
  body: string;
  authorId: string;
  resourceType: 'user';  // union grows with enum
  resourceId: string;
  createdAt: Date;
  updatedAt: Date;
}
```
- Adds a discriminator so the system knows what kind of thing the comment is attached to
- Enables future query patterns like "all comments on users" vs "all comments on documents"
- Small additional complexity but establishes a clear pattern for polymorphic references
- The enum becomes the registry of commentable resource types

**Recommendation**: Option B. The task explicitly says "any resource," which signals this will be polymorphic. Adding `resourceType` now is low cost and prevents a migration later when a second resource type appears. The enum starts with just `['user']` and grows naturally.

**Awaiting your decision on this before writing implementation code.**
