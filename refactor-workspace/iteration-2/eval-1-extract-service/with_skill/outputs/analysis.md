# Refactor Analysis: Extract AuthService from UserManager

## Current Structure

`UserManager` is a god object handling three distinct concerns:

| Concern | Methods | Dependencies |
|---------|---------|--------------|
| **User CRUD** | `createUser`, `getUserById`, `updateUser`, `deleteUser` | `db.users`, `email`, `crypto.hashPassword` |
| **Authentication** | `login`, `logout`, `validateSession` | `db.users`, `db.sessions`, `crypto.verifyPassword`, `crypto.generateToken` |
| **Password Management** | `changePassword`, `requestPasswordReset`, `resetPassword` | `db.users`, `db.passwordResets`, `crypto.*`, `email` |

### Consumers
- `apiRoutes.ts` — instantiates a single `UserManager` and calls all methods across all three concerns

### Blast Radius
- `userManager.ts` — gets split
- `apiRoutes.ts` — must import from new service(s) instead of single manager
- `userManager.test.ts` — tests must split to match new service boundaries

### Infrastructure (unchanged)
- `db.ts`, `crypto.ts`, `email.ts` — no changes needed

---

## The Boundary Question

The user's direction is clear: **extract auth into its own service**. The question is where password management lands. This isn't a minor detail — it determines the coupling between the two resulting services and affects how future auth-related features (MFA, OAuth, account lockout) get added.

---

## Option A: Auth Owns All Credential Logic

**AuthService** gets: `login`, `logout`, `validateSession`, `changePassword`, `requestPasswordReset`, `resetPassword`

**UserService** gets: `createUser`, `getUserById`, `updateUser`, `deleteUser`

### Rationale
Password management is fundamentally about credentials — "proving you are who you say you are." Every password method uses `crypto` functions (hash, verify, generateToken) and interacts with auth-specific DB tables (`sessions`, `passwordResets`). Grouping by the data/domain they operate on: credentials belong with auth.

### Trade-offs
- **Pro**: `UserService` becomes a clean CRUD service with zero crypto dependencies. Auth is fully self-contained — if you later add MFA, OAuth, or account lockout, it all goes in `AuthService`.
- **Pro**: Clear dependency direction — `AuthService` depends on `db.users` (read-only for lookups), `UserService` never touches auth tables.
- **Con**: `AuthService` is the larger of the two (6 methods vs 4). Acceptable — auth is inherently more complex than CRUD.
- **Con**: `createUser` in `UserService` still needs to hash the password before storing it. This means `UserService` imports `hashPassword` from `crypto`, creating a small overlap. Alternatively, `createUser` could delegate password hashing to `AuthService`, but that introduces a runtime dependency between the services.

### What gets cleaned up
- `userManager.ts` — deleted entirely
- `userManager.test.ts` — deleted, replaced by `authService.test.ts` and `userService.test.ts`

---

## Option B: Password Management Stays with UserService

**AuthService** gets: `login`, `logout`, `validateSession`

**UserService** gets: `createUser`, `getUserById`, `updateUser`, `deleteUser`, `changePassword`, `requestPasswordReset`, `resetPassword`

### Rationale
Password management modifies user records. `changePassword` and `resetPassword` both call `db.users.update`. From a data-ownership perspective, anything that writes to the `users` table belongs with the user service.

### Trade-offs
- **Pro**: `AuthService` is minimal and focused — sessions only. Very clean boundary.
- **Pro**: No cross-service dependency questions. Each service owns its DB tables cleanly: `UserService` owns `users` + `passwordResets`, `AuthService` owns `sessions`.
- **Con**: `UserService` is still fairly large (7 methods) and still imports all of `crypto`. It's a smaller god object — the password concern hasn't really been separated, just the session concern.
- **Con**: Future auth features (MFA, OAuth, account lockout) will awkwardly straddle the boundary. Password resets are part of the auth flow, not the user management flow. If you add "forgot password via SMS" later, does that go in UserService? That feels wrong.

---

## Recommendation

**Option A.** Auth should own all credential logic.

The grouping principle is *domain cohesion*: everything about "proving identity" lives together. Password management is an auth concern that happens to touch user data — not a user concern that happens to involve passwords. When future auth work arrives (MFA, OAuth, brute-force protection), Option A has a clear home for it. Option B will force another extraction.

The small overlap (`createUser` needing to hash a password) is handled cleanly: `UserService.createUser` calls `hashPassword` directly — it's a utility function, not a service boundary crossing. The password hash is just a field on the user record at creation time.

---

## Decision Needed

**Which option do you want to proceed with?** I recommend Option A (auth owns all credential logic), but this is a boundary decision that shapes future development. Confirm the direction and I will execute the full refactor.
