# Code Review: NotificationPreferencesService

## Context

This PR adds a `NotificationPreferencesService` that manages user notification settings -- channel preferences (email/push/sms), quiet hours, digest settings, and a `shouldNotify` check. The service is a new module in `src/services/` with an accompanying test file.

The scope is a new feature. The codebase already has a `UserService` with its own `updatePreferences` method and a `validationHelpers.ts` module with time-format validation.

---

## Blocking

### 1. `isInQuietHours` uses server-local time, ignoring the user's timezone

**What**: `isInQuietHours` (line 95-96) calls `new Date()` and reads `.getHours()` / `.getMinutes()`, which returns the server's local time. The `User` model has a `timezone` field on `preferences`, but it is never consulted. A user in `Asia/Tokyo` with quiet hours `22:00-08:00` will be evaluated against whatever timezone the server runs in.

**Why**: This is a correctness bug. Quiet hours are meaningless if they are not evaluated in the user's timezone. Every user not in the server's timezone will get incorrect quiet-hours behavior. In production this means notifications delivered during sleep or suppressed during work hours.

**How**: Use the user's `preferences.timezone` to compute the current time in their zone. `Intl.DateTimeFormat` or a library like `date-fns-tz` can do this. The `isInQuietHours` method already fetches the full preferences via `getPreferences` -- extend it to also retrieve the timezone (or accept the full user/preferences object).

### 2. `shouldNotify` makes two separate database calls for the same user

**What**: `shouldNotify` (lines 108-116) calls `this.getPreferences(userId)` on line 109, then calls `this.isInQuietHours(userId)` on line 112, which internally calls `this.getPreferences(userId)` again. That is two `db.users.findById` calls for the same user in the same logical operation.

**Why**: This is a correctness concern under concurrent writes (the preferences could change between the two reads, producing an inconsistent decision) and an unnecessary performance cost. In a hot path like notification dispatch, doubling database reads per notification adds up.

**How**: Refactor so that `shouldNotify` fetches preferences once and passes the data to a pure helper that evaluates quiet hours. For example, extract the quiet-hours logic into a method like `isCurrentlyInQuietHours(prefs: NotificationSettings, timezone: string): boolean` that takes data rather than a userId.

---

## Should Fix

### 3. Duplicated time-validation regex -- the code acknowledges it

**What**: Line 119-121 contains `isValidTime` with a comment `// Duplicated from validationHelpers.ts -- same regex`. The identical function `isValidTimeFormat` already exists in `src/services/validationHelpers.ts`.

**Why**: The comment makes the duplication intentional and visible, but intentional duplication is still duplication. When the format requirements change (e.g., supporting seconds, or switching to a different validation strategy), only one copy will get updated. The codebase already has a shared validation module specifically for this purpose.

**How**: Import and use `isValidTimeFormat` from `validationHelpers.ts`. Delete the private `isValidTime` method.

### 4. `getOrganizationDefaults` can return all channels disabled

**What**: Lines 83-86 compute each channel as `count > users.length / 2`. In an org where fewer than half of users have any given channel enabled, the result is `{ email: false, push: false, sms: false, ... }`. This violates the service's own invariant (line 32-34) that at least one channel must be enabled.

**Why**: If these "defaults" are ever applied to a user (e.g., when onboarding a new user to an org), the resulting state would fail the `updatePreferences` validation. An internal method that produces states the service itself rejects is a consistency problem.

**How**: After computing the defaults, apply the same invariant: if all channels are false, fall back to a sensible default (e.g., `email: true`). Alternatively, document that this method returns statistical data, not valid preferences, and rename it accordingly (e.g., `getOrganizationStatistics`).

### 5. `updatePreferences` bypasses `UserService` and writes the full user object directly

**What**: Lines 43-49 call `db.users.update(userId, { ...user, ... })` directly, passing the entire user object. The existing `UserService.updatePreferences` (in `userService.ts`) already handles partial preference updates with the same fetch-merge-save pattern.

**Why**: Two services now independently implement user-preference persistence. If `UserService.updatePreferences` gains additional logic in the future (audit logging, event emission, cache invalidation), `NotificationPreferencesService` will silently skip it. This is the same drift problem as the duplicated validation, but at the persistence layer where it is harder to detect.

**How**: Either delegate to `UserService.updatePreferences` for the write, or extract the shared write logic into a common method. The notification service should own the validation and merging of notification-specific fields, but the actual user persistence should go through one path.

### 6. Quiet hours pair validation has a falsy-value bug

**What**: Line 37-39 checks `merged.quietHoursStart && !merged.quietHoursEnd`. If `quietHoursStart` is the empty string `""`, it is falsy, so the pair validation passes even though the state is actually incomplete (start is set to an invalid value, end is present). The time-format validation above would catch `""` for explicit updates, but not for values already stored in the database.

**Why**: If corrupted data exists in the database (e.g., from a migration or direct DB write), the pair validation silently accepts an inconsistent state.

**How**: Use explicit `!== undefined` checks instead of truthiness: `(merged.quietHoursStart !== undefined && merged.quietHoursEnd === undefined)`. This matches the intent -- checking presence, not truthiness.

### 7. Missing test coverage for `getOrganizationDefaults` and `isInQuietHours`

**What**: There are zero tests for `getOrganizationDefaults` and zero tests for `isInQuietHours`. These are two of the five public methods on the service.

**Why**: `getOrganizationDefaults` contains aggregation logic with a sort and threshold comparison -- exactly the kind of logic that harbors off-by-one errors. `isInQuietHours` has the overnight-range branch (line 103-104) which is a classic source of boundary bugs. Both of these need test coverage.

**How**: Add tests for:
- `getOrganizationDefaults`: empty org (already returns hardcoded defaults -- verify), single user, multiple users with mixed preferences, the all-channels-disabled edge case from finding #4.
- `isInQuietHours`: no quiet hours set, current time inside a same-day range, current time inside an overnight range, current time outside both range types, boundary values (exactly at start/end time).

---

## Consider

### 8. `shouldNotify` quietly treats email as immune to quiet hours

**What**: Line 113: `if (inQuietHours && channel !== 'email') return false;` -- email is hardcoded to bypass quiet hours.

**Why**: This is a product decision embedded in code with no documentation or configurability. It may be correct today, but it is invisible to anyone reading the `NotificationSettings` type or the quiet-hours configuration. A user who sets quiet hours reasonably expects all notifications to be suppressed. If this is intentional, it should be documented. If it should be user-configurable, consider adding an `emailBypassQuietHours` flag to `NotificationSettings`.

### 9. `getOrganizationDefaults` quietly drops quiet hours from the returned defaults

**What**: The return value on lines 82-88 includes `email`, `push`, `sms`, and `digest`, but never includes `quietHoursStart` or `quietHoursEnd`. Since `NotificationSettings` has these as optional fields, TypeScript will not flag the omission.

**Why**: This may be intentional (quiet hours are personal, not org-level), but it is worth being explicit. If a caller spreads these defaults onto a new user's preferences, the user will have no quiet hours even if every member of the org has them set.

### 10. No rate limiting or idempotency on `updatePreferences`

**What**: `updatePreferences` does a read-then-write without any concurrency control. Two concurrent calls could both read the same state, apply different partial updates, and the last write wins, silently dropping the first update.

**Why**: For user preferences this is likely low-risk today, but if this service is ever called from an API endpoint handling rapid form submissions or mobile retry logic, the race window is real. Worth noting for when the service moves to a higher-throughput context.
