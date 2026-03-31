# Analysis: SMS Notification Support

## Codebase Scan

**Package structure**: Flat, domain-based (`notification/`, `user/`). No `internal/`, no `cmd/`.

**Existing interface**: `notification.Sender` with a single method `Send(to, subject, body string) error`. `EmailSender` implements it. The interface is defined alongside the implementation (implementer side), not consumer side.

**Error handling**: Simple `error` returns, no sentinel errors or wrapping.

**Dependency injection**: None established. No constructors — `EmailSender` is a zero-value struct.

**Testing**: No tests exist.

**Naming**: Clean Go conventions, no stutter.

## Pattern Decisions to Surface

### Decision 1: Where does the `Sender` interface live?

The existing `Sender` interface is defined in the `notification` package alongside `EmailSender`. The go:writer skill says "accept interfaces, return structs" and "define interfaces at the consumer." However, this codebase already defines `Sender` at the implementer. The new `NotificationService` will be the primary consumer.

**Option A: Move `Sender` interface to the consumer (NotificationService)**
The `NotificationService` consumes senders, so it would define what it needs. This is textbook Go idiom. But it means changing the existing file, which the task says not to do.

**Option B: Keep `Sender` where it is**
The interface is already in `notification` and both `EmailSender` and `SMSSender` live in the same package. `NotificationService` imports and uses the interface from there. This matches the existing codebase convention, even though it's not the purest Go idiom.

**Recommendation: Option B.** The codebase already has this convention. The interface is small (1 method) and all senders live in the same package. Moving it would require modifying the original file (which the task prohibits). Follow what exists.

### Decision 2: `Send()` method signature — is it right for SMS?

The current `Sender` interface is `Send(to, subject, body string) error`. Email has a subject; SMS does not. Two options:

**Option A: SMSSender ignores the `subject` parameter**
Simple. `SMSSender.Send` receives `subject` but doesn't use it. The body is the SMS content. This keeps the interface uniform and every sender interchangeable.

**Option B: Change the interface to accept a `Message` struct**
More extensible, but requires modifying the existing interface and `EmailSender`, which the task prohibits.

**Recommendation: Option A.** The existing interface is established. SMS can concatenate subject+body or just use body. Keeping the same interface means all senders are plug-compatible, which is exactly what the multi-channel dispatch needs.

### Decision 3: Multi-channel dispatch pattern

The task asks for "a way to send notifications through multiple channels." This is a classic composite/fan-out.

**Option A: `MultiSender` composite that implements `Sender`**
A `MultiSender` holds `[]Sender` and calls each. It itself implements `Sender`, so it's composable — you can nest composites. Clean, simple, Go idiomatic.

**Option B: Multi-send logic lives inside `NotificationService`**
The service iterates over channels directly. Less composable but fewer types.

**Recommendation: Option A.** A `MultiSender` is a one-line abstraction that gives full composability. The `NotificationService` then uses it without caring whether it's one sender or many.

### Decision 4: How does `NotificationService` get user preferences?

The task says "decides which channels to use based on user preferences." The `User` struct has `Email` and `Phone` but no preferences field.

**Option A: Add a `Preferences` field to User**
A `Preferences` struct with `EmailEnabled bool`, `SMSEnabled bool`. But modifying `user.go` is prohibited.

**Option B: NotificationService accepts a `PreferenceResolver` interface**
The service calls something like `Channels(userID string) []string` to get preferences. Fully decoupled. But no preference storage exists yet — it's an interface with no implementation.

**Option C: `NotificationService` infers from User fields**
If `User.Phone != ""`, SMS is available. If `User.Email != ""`, email is available. Simple heuristic, no new types needed, works with the existing `User` struct as-is.

**Recommendation: Option C for now, with a `PreferenceSource` interface to allow override.** The service defaults to field-presence heuristic but accepts an optional interface for explicit preferences. This avoids modifying `user.go` and avoids over-engineering.

### Decision 5: Package placement for `NotificationService`

**Option A: In the `notification` package**
Everything notification-related in one place. The service imports `user.User` for preference resolution.

**Option B: New `service` package**
Separates orchestration from transport. But the codebase is flat and small — a new package for one type is premature.

**Recommendation: Option A.** Keep it in `notification/`. The codebase is flat and small. One package per concept; notifications are one concept.

## Summary of Recommendations

| Decision | Recommendation |
|----------|---------------|
| Interface location | Keep in `notification` (follow existing convention) |
| SMS and `Send()` signature | SMSSender ignores subject, uses body as SMS content |
| Multi-channel dispatch | `MultiSender` composite implementing `Sender` |
| User preferences | Field-presence heuristic with optional `PreferenceSource` interface |
| Package placement | Everything in `notification/` |

## Implementation Plan

1. `sms_sender.go` — `SMSSender` struct with Twilio config, implements `Sender`
2. `multi_sender.go` — `MultiSender` composite implementing `Sender`
3. `service.go` — `NotificationService` with channel routing based on user preferences
4. `sms_sender_test.go`, `multi_sender_test.go`, `service_test.go` — tests first for each
