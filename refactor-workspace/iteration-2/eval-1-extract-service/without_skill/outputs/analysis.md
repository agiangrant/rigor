# Refactoring Analysis: Extract AuthService from UserManager

## Problem

`UserManager` is a god object with three distinct responsibilities:

1. **User CRUD** -- creating, reading, updating, deleting users
2. **Authentication** -- login, logout, session validation
3. **Password Management** -- changing passwords, reset flow

These responsibilities have different reasons to change (user profile logic vs. auth policy vs. password policy), violating the Single Responsibility Principle. The class also mixes concerns in ways that make testing harder than necessary -- every test file must mock all dependencies even when testing a single concern.

## Responsibilities Breakdown

| Method | Concern | Destination |
|---|---|---|
| `createUser` | User CRUD | `UserService` |
| `getUserById` | User CRUD | `UserService` |
| `updateUser` | User CRUD | `UserService` |
| `deleteUser` | User CRUD | `UserService` |
| `login` | Authentication | `AuthService` |
| `logout` | Authentication | `AuthService` |
| `validateSession` | Authentication | `AuthService` |
| `changePassword` | Password Management | `AuthService` |
| `requestPasswordReset` | Password Management | `AuthService` |
| `resetPassword` | Password Management | `AuthService` |

## Design Decision: Where does password management go?

Password management (change, reset) is an authentication concern, not a user-data concern. It uses `verifyPassword`, `hashPassword`, `generateToken`, and interacts with `db.passwordResets` and `db.sessions` -- all auth infrastructure. It belongs in `AuthService`.

`createUser` stays in `UserService` despite calling `hashPassword`, because user creation is fundamentally a CRUD operation. The password hashing there is just input preparation before persistence.

## Refactoring Plan

1. Create `AuthService` in `src/authService.ts` with login, logout, session validation, and all password management methods.
2. Create `UserService` in `src/userService.ts` with CRUD methods (rename from UserManager to follow the *Service convention).
3. Update `apiRoutes.ts` to instantiate both services and route to the correct one.
4. Split `userManager.test.ts` into `userService.test.ts` and `authService.test.ts`.
5. Delete `userManager.ts` and its test.

## Impact on Existing Files

- `src/userManager.ts` -- deleted, replaced by `userService.ts` + `authService.ts`
- `src/__tests__/userManager.test.ts` -- deleted, replaced by `userService.test.ts` + `authService.test.ts`
- `src/apiRoutes.ts` -- updated imports and instantiation
- `src/db.ts` -- unchanged
- `src/crypto.ts` -- unchanged
- `src/email.ts` -- unchanged
