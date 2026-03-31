# Analysis: Extract AuthService from UserManager

## Problem

`UserManager` is a god object with three distinct responsibilities:

1. **User CRUD** -- `createUser`, `getUserById`, `updateUser`, `deleteUser`
2. **Authentication** -- `login`, `logout`, `validateSession`
3. **Password Management** -- `changePassword`, `requestPasswordReset`, `resetPassword`

These responsibilities have different reasons to change, different collaborators, and different consumers. Authentication logic (session management, token generation) has no business living alongside basic CRUD operations.

## Dependency Analysis

| Method | db.users | db.sessions | db.passwordResets | crypto | email |
|---|---|---|---|---|---|
| createUser | yes | - | - | hashPassword | yes |
| getUserById | yes | - | - | - | - |
| updateUser | yes | - | - | - | - |
| deleteUser | yes | - | - | - | yes |
| login | yes | yes | - | verifyPassword, generateToken | - |
| logout | - | yes | - | - | - |
| validateSession | yes | yes | - | - | - |
| changePassword | yes | - | - | verifyPassword, hashPassword | - |
| requestPasswordReset | yes | - | yes | generateToken | yes |
| resetPassword | yes | - | yes | hashPassword | - |

Key observations:
- Auth methods (`login`, `logout`, `validateSession`) are the only consumers of `db.sessions`.
- Password methods are the only consumers of `db.passwordResets`.
- `changePassword` and `requestPasswordReset`/`resetPassword` form a cohesive password-management concern that bridges auth and user data.

## Refactoring Decision

Extract **AuthService** to own authentication and password management. Rationale:

- Auth and password management are tightly coupled -- password resets generate tokens, change-password verifies credentials. These are auth concerns, not user-data concerns.
- `db.sessions` and `db.passwordResets` become private to `AuthService`, giving it clear data ownership.
- `UserManager` shrinks to pure user CRUD (create, read, update, delete) plus the welcome/goodbye emails that are part of the user lifecycle.
- Password hashing during `createUser` stays in `UserManager` because it's part of user creation, not auth flow.

## Consumers Affected

- **`apiRoutes.ts`** -- Currently instantiates one `UserManager`. After refactoring, it instantiates both `UserManager` and `AuthService`, routing each handler to the correct service.
- **`userManager.test.ts`** -- Tests split into two files: `userService.test.ts` (CRUD tests) and `authService.test.ts` (auth + password tests).

## Files Created

| File | Purpose |
|---|---|
| `src/userService.ts` | User CRUD (renamed from `userManager.ts`) |
| `src/authService.ts` | Authentication + password management |
| `src/apiRoutes.ts` | Updated to use both services |
| `src/__tests__/userService.test.ts` | Tests for user CRUD |
| `src/__tests__/authService.test.ts` | Tests for auth + password management |

## Files Deleted

| File | Reason |
|---|---|
| `src/userManager.ts` | Replaced by `userService.ts` and `authService.ts` |
| `src/__tests__/userManager.test.ts` | Replaced by split test files |

## Unchanged Files

- `src/db.ts` -- no changes needed
- `src/crypto.ts` -- no changes needed
- `src/email.ts` -- no changes needed
