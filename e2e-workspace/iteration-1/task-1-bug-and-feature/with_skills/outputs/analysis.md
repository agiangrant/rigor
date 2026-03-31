# Analysis: Booking Service Bug Fix + Recurring Bookings Feature

## Bug: Overlapping Booking Conflict Check

### Diagnosis (following /debug)

**Step 1 — Holistic View:**
The booking service allows users to create room bookings with a start and end time. Before creating a booking, it checks for conflicts with existing bookings via `db.bookings.findByRoomAndTime()`. The intended behavior is to prevent double-booking a room.

**Step 2 — Data and Context:**
The bug is in the conflict detection logic. The `findByRoomAndTime` method in `db.ts` accepts `roomId`, `start`, and `end` — but the semantics are exact-match. Two time ranges overlap when `startA < endB AND startB < endA`. The current implementation only catches bookings with identical start/end times, missing:
- A new booking that starts during an existing booking
- A new booking that ends during an existing booking
- A new booking that completely contains an existing booking
- An existing booking that completely contains the new booking

**Step 3 — Fix Scope:**
This is a straightforward logic bug — the overlap predicate is wrong. The fix is to replace exact-match semantics with proper range overlap detection. No structural changes needed.

**Step 5 — Fix approach (TDD):**
1. Write failing tests that demonstrate overlapping bookings are not caught
2. Fix `findByRoomAndTime` to use proper overlap detection
3. Verify all conflict scenarios pass

### Root Cause

`db.bookings.findByRoomAndTime` uses exact time matching instead of range overlap logic. The fix belongs in the db layer (the query) AND the service should be tested to ensure it correctly rejects all overlap scenarios.

Since `db.ts` is a stub, the real fix is:
1. The db method signature already accepts start/end — its contract should be "find bookings that overlap with this range"
2. In tests, we mock this method to return overlapping bookings and verify the service throws ConflictError

## Feature: Recurring Bookings (daily/weekly)

### Design Decisions (following /ts:writer + /architecture-decisions)

**Codebase scan results:**
- Error handling: Custom error classes thrown from services (AppError hierarchy)
- Async: async/await throughout
- Data modeling: TypeScript interfaces, no runtime validation
- Module structure: Services in `src/services/`, models in `src/models/`, tests in `src/__tests__/`
- Pattern: Class-based services with methods

**Recurring booking approach:**
The `BookingService.create` method will accept an optional recurrence configuration. When present, it generates all individual bookings for the recurrence window. Each generated booking is conflict-checked independently.

**Model additions:**
- `RecurrencePattern`: `{ type: 'daily' | 'weekly'; occurrences: number }` — defines how bookings repeat
- Extend `CreateBookingInput` with optional `recurrence` field
- Return type for recurring creation: array of Booking objects

**Key decisions:**
- Recurrence is defined by count (`occurrences`), not an end date — simpler, avoids timezone edge cases
- Each occurrence is an independent booking — canceling one doesn't cancel all (series management is a separate feature)
- All occurrences are conflict-checked before any are created — atomic: either all succeed or none do
- Maximum occurrences capped at 52 (one year of weekly bookings) to prevent abuse

## Test Plan (following /tdd)

### BookingService Tests

**Happy paths:**
- Creates a booking successfully
- Creates a booking with all fields populated
- Returns bookings for a room
- Cancels an existing booking

**Conflict detection (bug fix):**
- Rejects booking with exact same time range
- Rejects booking that starts during existing booking
- Rejects booking that ends during existing booking
- Rejects booking that contains existing booking entirely
- Rejects booking contained within existing booking
- Allows booking that ends exactly when another starts (adjacent, not overlapping)
- Allows booking in different room at same time

**Validation:**
- Rejects empty title
- Rejects start time >= end time
- Rejects booking for non-existent room

**Recurring bookings:**
- Creates daily recurring bookings
- Creates weekly recurring bookings
- Rejects if any occurrence conflicts
- Rejects if occurrences exceeds maximum (52)
- Rejects if occurrences is less than 2
- All occurrences have correct times

## File Structure

Following existing conventions (`/code-structure`):
- `src/services/bookingService.ts` — fixed + extended service
- `src/models/booking.ts` — new file for booking types (matches existing `room.ts` pattern)
- `src/db.ts` — extended with overlap-aware query stub
- `src/__tests__/bookingService.test.ts` — new comprehensive test file (matches existing `roomService.test.ts` pattern)
