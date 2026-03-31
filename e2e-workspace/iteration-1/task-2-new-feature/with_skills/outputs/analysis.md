# Notification System — Architecture Analysis

## Understanding the Decision

**What is the actual decision?** How to add a notification layer to the booking system that sends messages when bookings are created (notify room owner) and cancelled (notify booker), supporting email now and Slack later.

**What triggered this?** A new feature request. This introduces a new architectural layer that doesn't exist in the codebase.

**Existing architecture constraints:**
- The project is organized by layer: `src/services/`, `src/models/`, `src/errors/`
- Services handle business logic (`BookingService`, `RoomService`)
- Services are classes with async methods
- Dependencies use a module-level singleton pattern (`db` imported directly)
- Errors use custom error classes extending a base `AppError`
- Tests live in `src/__tests__/` with `vi.mock()` for dependency mocking
- No existing event system, no notification infrastructure, no user/owner model with contact info

## Questions Requiring Human Input

These questions change which option I would recommend. **I need answers before proceeding with the architecture.**

### Question 1: Coupling Strategy — How should notifications be triggered?

This is the most consequential decision. It determines how `BookingService` relates to the notification system and affects testability, extensibility, and failure isolation.

**Option A: Direct service injection — `NotificationService` injected into `BookingService`**

```typescript
// BookingService receives NotificationService as a dependency
export class BookingService {
  constructor(private notifications: NotificationService) {}

  async create(input: CreateBookingInput): Promise<Booking> {
    // ... existing logic ...
    const booking = await db.bookings.create(input);
    await this.notifications.bookingCreated(booking, room);
    return booking;
  }
}
```

Trade-offs:
- Simple, explicit, easy to follow the code path
- Easy to test (inject a mock NotificationService)
- BookingService is directly coupled to notifications — every new "side effect" of booking creation means modifying BookingService
- Notification failures must be handled inline (should a failed email prevent a booking from being created?)
- Fits the current codebase style (services calling services)

What it enables: Straightforward addition of notifications without new patterns.
What it constrains: Every new subscriber to booking events requires a BookingService change.
Reversibility: Medium — changing to events later requires modifying BookingService and all callers.

**Option B: Event-based — BookingService emits events, listeners handle notifications**

```typescript
// BookingService emits events
export class BookingService {
  constructor(private eventBus: EventBus) {}

  async create(input: CreateBookingInput): Promise<Booking> {
    // ... existing logic ...
    const booking = await db.bookings.create(input);
    await this.eventBus.emit('booking.created', { booking, room });
    return booking;
  }
}

// Separate listener handles notifications
class BookingNotificationListener {
  constructor(private notifier: NotificationService) {}

  async onBookingCreated(event: { booking: Booking; room: Room }) {
    await this.notifier.notifyRoomOwner(event.room, event.booking);
  }
}
```

Trade-offs:
- Decouples BookingService from notification logic entirely
- Adding new side effects (analytics, audit logging) doesn't touch BookingService
- More indirection — harder to trace "what happens when a booking is created?"
- Requires an EventBus abstraction that doesn't exist yet (new pattern for the codebase)
- More infrastructure to build and test
- Better failure isolation (listeners can fail independently)

What it enables: Any future side effect of bookings (webhooks, audit logs, analytics) just adds a listener.
What it constrains: Nothing significant — events are a superset of direct calls.
Reversibility: Low cost to add, moderate cost to remove (listeners spread across codebase).

**My recommendation:** For a codebase this size with only one consumer of booking events (notifications), **Option A (direct injection)** is the pragmatic choice. It matches the existing patterns (services calling services), introduces no new infrastructure, and is easy to refactor into events later IF more consumers emerge. YAGNI applies — we know about notifications, we don't yet know about analytics or audit logs.

However, if you anticipate multiple consumers soon (audit logging, analytics, webhooks), Option B pays for itself quickly.

**I need your decision on this before proceeding.**

### Question 2: Notification Failure Semantics

Should a notification failure prevent the booking operation from succeeding?

**Option A: Fire-and-forget** — Booking succeeds even if notification fails. Log the error.
- User gets their booking. Notification failure is a degraded experience, not a system failure.
- Simpler error handling. Matches most booking system expectations.

**Option B: Fail the operation** — If notification fails, the booking fails too.
- Guarantees the owner is always notified.
- A flaky email service could make the entire booking system unreliable.

**Option C: Queue for retry** — Booking succeeds, failed notifications are queued for retry.
- Best UX and reliability, but requires retry infrastructure that doesn't exist.

**My recommendation:** Option A (fire-and-forget with logging). A booking should never fail because an email couldn't be sent. Option C is ideal but premature given the codebase has no queue infrastructure.

**I need your decision on this before proceeding.**

### Question 3: Room Owner Identity

The current `Room` model has no `ownerId` or owner contact information:

```typescript
export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  amenities: string[];
}
```

To notify the "room owner," we need to know who owns the room and how to reach them. Options:

**Option A: Add `ownerId` to Room, resolve contact info via a `UserService`**
- Clean separation: Room knows its owner, UserService knows contact details
- Requires a User model and UserService that don't exist yet

**Option B: Add `ownerEmail` directly to Room**
- Simpler, no new User model needed
- Doesn't scale to Slack (would need `ownerSlackId` too)
- Mixes concerns (Room shouldn't know about notification channels)

**Option C: Add `ownerId` to Room, pass owner info as part of a lookup/resolver pattern**
- Room has `ownerId: string`, notification system resolves contact info via a `RecipientResolver`
- More flexible, supports multiple channels without touching Room model

**My recommendation:** Option A. Adding `ownerId` to Room is the minimal, correct change. A `UserService` (even stubbed) is the right place for contact info. This composes well with Slack later — the User model can hold both email and Slack ID.

**I need your decision on this before proceeding.**

---

## What I CAN Proceed On (Independent of the Above Decisions)

Regardless of the architecture decisions above, certain pieces are known and can be built now:

### 1. Notification Channel Interface

All options above need a `NotificationChannel` abstraction. Whether we use direct injection or events, notifications will flow through channels (email now, Slack later). This interface is safe to define:

```typescript
interface NotificationChannel {
  send(recipient: Recipient, message: NotificationMessage): Promise<void>;
}
```

### 2. Notification Message Types

The domain events are known — "booking created" and "booking cancelled." The message types can be defined:

```typescript
type NotificationType = 'booking.created' | 'booking.cancelled';

interface NotificationMessage {
  type: NotificationType;
  subject: string;
  body: string;
}
```

### 3. Test Structure

Tests will live in `src/__tests__/` following the existing convention (`notificationService.test.ts`). The test patterns (vitest, vi.mock, vi.mocked) are established.

### 4. File Placement (`/code-structure` analysis)

The project is organized by layer. Following the established pattern:
- `src/services/notificationService.ts` — notification orchestration
- `src/notifications/` — new directory for channel implementations and types
  - `src/notifications/channels/emailChannel.ts`
  - `src/notifications/channels/slackChannel.ts` (future)
  - `src/notifications/types.ts`
- `src/__tests__/notificationService.test.ts`

**Note:** Creating `src/notifications/` is a new top-level directory, which per `/code-structure` requires confirmation. However, it follows the layer-based pattern (separating notification infrastructure from business logic services). The alternative is putting everything under `src/services/`, but channel implementations are infrastructure, not business logic.

**I need confirmation on the `src/notifications/` directory placement.**

---

## Summary of Decisions Needed

| # | Decision | My Recommendation | Impact |
|---|----------|-------------------|--------|
| 1 | Coupling strategy | Direct injection (Option A) | Determines overall architecture |
| 2 | Failure semantics | Fire-and-forget (Option A) | Determines error handling pattern |
| 3 | Room owner identity | Add `ownerId` to Room + UserService (Option A) | Determines data model changes |
| 4 | Directory placement | `src/notifications/` for channels/types | Determines file structure |

**I am stopping here for these decisions.** Once confirmed, I will proceed with TDD implementation following `/tdd` and `/ts:writer` skills.

## Code I Can Write Now

Despite needing the above decisions, the foundational types and interfaces are safe to write. I am providing these files below as they are valid regardless of which options are chosen above.
