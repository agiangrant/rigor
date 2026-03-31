# Analysis: Input Validation for UserService

## Codebase Scan

### Existing Patterns
- **Error handling**: No established pattern. `getById` returns `User | null` (null for not-found), `create` returns `User` with no failure path.
- **Async**: async/await throughout.
- **Data modeling**: Interfaces for domain types, union literals for constrained values (`'admin' | 'member'`). No runtime validation — types are compile-time only.
- **Module structure**: Named exports, barrel file at `types/index.ts`, service classes in `services/`.
- **Naming**: camelCase methods, PascalCase for types/classes.
- **DI**: Module-level singleton (`db` export).
- **Tests**: None exist. vitest is in devDependencies but no test files present.
- **Validation**: No pattern established anywhere in the codebase.

### What Needs to Change
`UserService.create(email, role)` accepts raw strings with no validation. The task requires:
1. Email format validation
2. Empty name checking (note: `create` currently has no `name` param — this means adding one)
3. Role value enforcement (currently typed as union but no runtime check)

## Pattern Decision Required: Validation Approach

The codebase has no established validation pattern. This is a foundational decision — whatever pattern is chosen here becomes the convention for all future input validation across the project. Three viable options:

---

### Option A: Manual Validation with Result Type

Return a discriminated union instead of throwing. Validation errors are part of the return type, making failure visible to callers at compile time.

```typescript
type ValidationError = {
  field: string;
  message: string;
};

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] };

// In UserService:
async create(input: CreateUserInput): Promise<Result<User>> {
  const errors: ValidationError[] = [];
  if (!input.name.trim()) {
    errors.push({ field: 'name', message: 'Name must not be empty' });
  }
  if (!isValidEmail(input.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  if (!['admin', 'member'].includes(input.role)) {
    errors.push({ field: 'role', message: 'Role must be admin or member' });
  }
  if (errors.length > 0) return { ok: false, errors };

  const user = await db.users.create(input);
  return { ok: true, value: user };
}
```

**Composes with existing code**: Requires changing `create`'s return type. Callers must handle the `ok: false` case — compiler enforces this. The `getById` pattern (returning `null`) is different but not conflicting; `null` means "not found" while `Result` means "operation outcome."

**Forward-looking**: Scales well — every service method that validates input uses the same `Result` type. Easy to test (just check `ok` field). No dependencies. The `Result` type is reusable across all services. Composes naturally with Express error responses (map `errors` array to 400 response).

**Downsides**: More boilerplate than a library. Validation logic lives inside service methods or in standalone validator functions you write yourself. No schema reuse between validation and types.

---

### Option B: Zod Schemas (Runtime Validation Library)

Use Zod to define schemas that serve as both runtime validators and TypeScript type sources. Schemas become the single source of truth.

```typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name must not be empty'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member']),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// In UserService:
async create(input: unknown): Promise<User> {
  const parsed = CreateUserSchema.parse(input); // throws ZodError on failure
  return db.users.create(parsed);
}
```

**Composes with existing code**: Zod throws on failure, which means callers need try/catch or a middleware error handler. The existing code doesn't throw for expected failures (`getById` returns null), so this introduces a second failure convention. Existing `User` interface could be replaced by or aligned with a Zod schema.

**Forward-looking**: Schemas are composable (`.extend()`, `.pick()`, `.omit()`). As the API grows, schemas can be shared for request parsing, response shaping, and DB input. Zod is the de facto standard for TypeScript runtime validation. Works naturally with Express middleware for request validation.

**Downsides**: Adds a dependency (~50KB). Throws errors rather than returning them — less visible in type signatures unless you wrap it. Existing types would ideally migrate to be Zod-inferred to avoid duplication, which is a broader change.

---

### Option C: Custom Validation Errors (Thrown)

Throw a custom `ValidationError` class. Lightweight, no dependencies, follows the throw-and-catch convention common in Express apps.

```typescript
export class ValidationError extends Error {
  constructor(public readonly fields: { field: string; message: string }[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// In UserService:
async create(input: CreateUserInput): Promise<User> {
  const errors: { field: string; message: string }[] = [];
  if (!input.name.trim()) errors.push({ field: 'name', message: 'Name must not be empty' });
  if (!isValidEmail(input.email)) errors.push({ field: 'email', message: 'Invalid email format' });
  if (!['admin', 'member'].includes(input.role)) errors.push({ field: 'role', message: 'Role must be admin or member' });
  if (errors.length > 0) throw new ValidationError(errors);

  return db.users.create(input);
}
```

**Composes with existing code**: Express apps commonly use error classes with middleware that catches them and returns appropriate HTTP responses. Return type stays `Promise<User>` — no change for callers on the happy path. But failure is invisible in the type signature.

**Forward-looking**: Simple to add more error classes later (`NotFoundError`, `ConflictError`). Works well with Express error middleware. Less type-safe than Result — callers can forget to catch.

**Downsides**: Validation failures are invisible in the type system. Tests need try/catch or `.rejects`. No schema reuse between validation and types.

---

## Recommendation

**Option A (Result type)** is the best fit for this codebase. Reasoning:

1. The project already has zero dependencies beyond express and pg. Adding Zod for a small service is premature — if the project grows to need schema-level validation, it can migrate later.
2. The codebase already uses a "return the outcome" style (`User | null` for getById). A `Result` type extends that philosophy — failures are values, not exceptions.
3. It's the most testable: assert on the return value, no try/catch needed.
4. It makes validation errors visible in the type signature, which aligns with the TypeScript philosophy of using the compiler to prevent mistakes.

But this is a pattern that will propagate across the entire codebase. **You should decide.**

## Pending

Implementation is blocked on this pattern decision. Once confirmed, I will:
1. Add the `Result` type (or chosen alternative) to `types/index.ts`
2. Add `CreateUserInput` type with `name` field
3. Write tests first (TDD per project convention)
4. Implement validation in `UserService.create`
