# Code Review: NotificationPreferencesService

## Summary

This PR adds a `NotificationPreferencesService` that manages per-user notification preferences: channel toggling (email/push/sms), quiet hours, digest settings, an org-defaults aggregator, and a `shouldNotify` gate. The service is reasonably structured and the validation logic is solid in the areas it covers. The issues below range from a real bug to design concerns worth discussing.

---

## Issues

### Bug: `isInQuietHours` ignores the user's timezone

`isInQuietHours` compares quiet hours against `new Date()`, which uses the server's local time. The `User` model has a `timezone` field on `UserPreferences`, and quiet hours only make sense relative to the user's timezone. As written, a user in Tokyo with quiet hours 22:00-08:00 will have their quiet hours evaluated against whatever timezone the server runs in.

**File:** `src/services/notificationPreferencesService.ts`, lines 91-106

This is a correctness bug, not a nit. The fix is to convert `now` to the user's timezone before extracting hours/minutes. The user's timezone is available via `user.preferences.timezone` and is already validated elsewhere with `Intl.DateTimeFormat`.

---

### Bug: `shouldNotify` calls `getPreferences` twice

`shouldNotify` calls `this.getPreferences(userId)` once, then calls `this.isInQuietHours(userId)` which internally calls `this.getPreferences(userId)` again. That's two DB round-trips for the same data in a single logical operation. This is a latency and consistency concern -- the preferences could theoretically change between the two reads.

**File:** `src/services/notificationPreferencesService.ts`, lines 108-116

Consider refactoring `isInQuietHours` to accept a `NotificationSettings` object (or extract a pure helper that takes the settings + current time), so `shouldNotify` can fetch once and pass the data through.

---

### Duplicated validation logic

The `isValidTime` private method (line 118-121) is explicitly flagged in its own comment as duplicated from `validationHelpers.ts`. The codebase already has `isValidTimeFormat` in `src/services/validationHelpers.ts` with the identical regex. Import and use it instead.

**File:** `src/services/notificationPreferencesService.ts`, lines 118-121

---

### Design: Bypasses existing `UserService` for data access

The existing `UserService` encapsulates user lookup and preference updates (`getById`, `updatePreferences`). This new service goes directly to `db.users.findById` and `db.users.update`, duplicating the "user not found" check and the shallow-merge-and-save pattern. This means:

- Two services now independently own user persistence logic.
- If `UserService` gains middleware behavior (audit logging, cache invalidation, event emission), this service silently bypasses it.

Consider either injecting `UserService` as a dependency or having this service delegate to it for reads and writes. The notification-specific validation stays here; the user-level persistence stays in `UserService`.

---

### Design: `getOrganizationDefaults` is fragile with missing data

`getOrganizationDefaults` accesses `user.preferences?.notifications?.digest` with optional chaining, defaulting to `'none'`. But it does not guard against users who might have no `preferences` object at all in the DB (the type says it's required, but the DB stubs return `any`). More importantly, the method computes "organization defaults" by polling every user in the org and taking a majority vote. This is a potentially expensive query that scans all users, and the semantics are surprising -- most callers would expect org defaults to be an explicit org-level configuration, not a derived aggregate.

If this is intentional (derive defaults from existing behavior), document that clearly. If it's a placeholder, flag it as such. Either way, this will not scale for large organizations.

**File:** `src/services/notificationPreferencesService.ts`, lines 54-89

---

### Test gap: `isInQuietHours` is not directly tested

There are no tests for `isInQuietHours`. The quiet hours logic has real complexity (overnight ranges, boundary conditions), and `shouldNotify` tests only cover the case where quiet hours are not set. A caller cannot verify that the overnight wrap-around logic (line 99-105) is correct without dedicated tests. Since this method is also time-dependent (calls `new Date()`), testing it properly requires injecting or mocking the current time.

---

### Test gap: `getOrganizationDefaults` is not tested

No tests cover the org defaults aggregation, which has sorting and counting logic that could easily break on edge cases (e.g., single user, tied digest counts, users with missing notification settings).

---

### Minor: `shouldNotify` quiet hours policy is undocumented

Line 113 makes a product decision: email ignores quiet hours, but push and SMS do not. This is the kind of business rule that should have a comment explaining the rationale, or ideally be configurable. As-is, the only documentation is an inline comment (`// Email ignores quiet hours`) that states *what* but not *why*.

---

## What's good

- The validation in `updatePreferences` is thorough: time format, at-least-one-channel, quiet-hours-pairing. These are real domain invariants and they're enforced in the right place.
- The merge-then-validate pattern (line 31-32) correctly checks the *resulting* state, not just the incoming update. This avoids the common mistake of validating inputs in isolation.
- The overnight quiet hours handling (start > end means wrap around midnight) is the right approach.

---

## Verdict

The timezone bug in `isInQuietHours` needs to be fixed before merging -- it will produce wrong results for any user not in the server's timezone. The duplicated validation helper and the direct DB access (bypassing `UserService`) should also be addressed. The missing test coverage for `isInQuietHours` and `getOrganizationDefaults` should be added. The `shouldNotify` double-fetch is worth cleaning up for correctness and performance.
