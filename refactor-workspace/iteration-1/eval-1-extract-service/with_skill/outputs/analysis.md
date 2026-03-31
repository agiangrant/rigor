# Refactor Analysis: Extract AuthService from UserManager

## Current State

`UserManager` is a god object with three distinct responsibilities:

1. **User CRUD** — `createUser`, `getUserById`, `updateUser`, `deleteUser`
2. **Authentication** — `login`, `logout`, `validateSession`
3. **Password Management** — `changePassword`, `requestPasswordReset`, `resetPassword`

### Dependency Map

```
apiRoutes.ts ──> UserManager ──> db (users, sessions, passwordResets)
                              ──> crypto (hashPassword, verifyPassword, generateToken)
                              ──> email (sendEmail)
```

### Consumers

- `apiRoutes.ts` — instantiates `UserManager` and calls methods from all three concerns
- `__tests__/userManager.test.ts` — tests createUser, login, changePassword, requestPasswordReset

### Blast Radius

- 3 files modified: `userManager.ts` (becomes `userService.ts`), `apiRoutes.ts`, test file
- 1 new file: `authService.ts`
- 1 new test file: `authService.test.ts`
- 1 file deleted: `userManager.ts` and its test
- Infrastructure files (`db.ts`, `crypto.ts`, `email.ts`) unchanged

## Target State

Two focused services replacing the monolithic `UserManager`:

### `UserService` (user CRUD only)
- `createUser(email, password, name)` — still hashes the password at creation time
- `getUserById(id)`
- `updateUser(id, data)`
- `deleteUser(id)`

### `AuthService` (authentication + password management)
- `login(email, password)`
- `logout(token)`
- `validateSession(token)`
- `changePassword(userId, currentPassword, newPassword)`
- `requestPasswordReset(email)`
- `resetPassword(resetToken, newPassword)`

### Boundary Decision

Password management belongs with `AuthService`, not `UserService`. Rationale:
- All password methods use `crypto` (hashPassword, verifyPassword, generateToken)
- Password reset uses the `sessions`/`passwordResets` tables — auth infrastructure
- These methods are about credentials, not user data
- `UserService` should not need to import any crypto functions

### Dependency Map After Refactor

```
apiRoutes.ts ──> UserService ──> db.users
                             ──> email
             ──> AuthService ──> db (users, sessions, passwordResets)
                             ──> crypto
                             ──> email (for password reset emails)
```

Note: `UserService.createUser` still needs `hashPassword` from crypto because it stores the initial password hash. This is acceptable — user creation requires setting an initial password. The alternative (having AuthService handle user creation) would muddy the CRUD boundary. The dependency is minimal: one import, one call.

## Approach

Single-pass extraction. No compatibility shims, no re-exports from old paths. The old `UserManager` class and its test file are deleted entirely.
