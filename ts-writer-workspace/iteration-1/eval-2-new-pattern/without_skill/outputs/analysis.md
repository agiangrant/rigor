# Analysis: Adding Input Validation to User Service

## Current State

The project is a small TypeScript API (`task-api`) with:
- **Types** (`src/types/index.ts`): `User` interface with `id`, `email`, and `role` ('admin' | 'member'). Also an `ApiResponse<T>` generic wrapper.
- **DB layer** (`src/db.ts`): Stub database with `findById` and `create` on users. `create` accepts `any` and spreads it into the return.
- **Service** (`src/services/userService.ts`): `UserService` class with `getById(id)` and `create(email, role)`. No validation whatsoever -- raw strings go straight to the DB.
- **Dependencies**: express, pg, typescript, vitest.

## What Needs Validation

1. **Email format** -- `create()` accepts any string as email. Need basic format validation.
2. **Empty names** -- The task mentions "empty names" but the current `User` type has no `name` field and `create()` has no name parameter. The type needs a `name` field added, and the service needs to accept and validate it.
3. **Role values** -- TypeScript's type system constrains role to `'admin' | 'member'` at compile time, but at runtime (e.g., from API input) any string could arrive. Need runtime validation.

## Key Design Decision: Validation Pattern

The codebase has **no existing validation pattern**. This is the central architectural decision.

### Options Considered

1. **Inline validation in the service** -- Simplest. Put validation logic directly in `create()`. Quick but doesn't scale; other services would duplicate patterns.
2. **Validation module with a Result type** -- Create a `src/validation/` module that exports small validator functions and a `ValidationResult` type. Service calls validators and returns structured errors. Composable and testable.
3. **Schema validation library (zod, yup, etc.)** -- Powerful but adds a dependency. The project has zero validation deps today; adding one for this scope is premature.

### Decision

**Option 2: Validation module with a Result type.** Rationale:
- No new dependencies (matches the project's minimal dependency footprint).
- Validators are pure functions -- trivially testable.
- A `ValidationError` type gives callers structured error information.
- The pattern composes: future services reuse the same validators and error type.
- YAGNI is guidance, not law -- a validation module is the obvious architectural direction for any service that accepts external input.

## Implementation Plan

### New Files

1. **`src/validation/errors.ts`** -- `ValidationError` class extending `Error`, carrying a `field` and `message`.
2. **`src/validation/validators.ts`** -- Pure validator functions: `validateEmail`, `validateNonEmpty`, `validateRole`. Each returns a `ValidationError | null`.
3. **`src/validation/index.ts`** -- Re-exports.
4. **`src/validation/__tests__/validators.test.ts`** -- Unit tests for each validator.
5. **`src/services/__tests__/userService.test.ts`** -- Tests for `UserService.create()` covering valid input, invalid email, empty name, bad role.

### Modified Files (as new copies, originals untouched)

1. **`src/types/index.ts`** -- Add `name: string` to `User`.
2. **`src/services/userService.ts`** -- `create(name, email, role)` calls validators, throws `ValidationError` on failure, then delegates to DB.
3. **`src/db.ts`** -- Update `create` stub to include `name`.
