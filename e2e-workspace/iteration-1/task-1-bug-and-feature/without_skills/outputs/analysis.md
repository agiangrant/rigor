# Analysis: Booking Service Bug Fix + Recurring Bookings

## Bug Identified

The booking conflict check in `BookingService.create()` delegates to `db.bookings.findByRoomAndTime()`, which (per the inline comment and the stub implementation) only catches exact time matches. Two bookings that partially overlap — e.g., 10:00-11:00 and 10:30-11:30 — would both be accepted, creating a double-booking.

**Root cause**: The `findByRoomAndTime` query compares `start === start && end === end` (exact match semantics) rather than checking whether the time ranges overlap.

**Fix**: Replace the exact-match check with proper range overlap logic. Two intervals [A_start, A_end) and [B_start, B_end) overlap when `A_start < B_end && B_start < A_end`. The fix is applied in two places:

1. `db.ts` — the `findByRoomAndTime` stub is updated to accept all bookings for a room and filter using overlap logic (simulating what a real DB query would do).
2. `BookingService.create()` — the service now calls `findByRoomOverlapping` (renamed for clarity) which uses the correct overlap predicate.

## Recurring Booking Feature

**Design decisions**:

- A `RecurrenceRule` type supports `daily` and `weekly` patterns with a configurable `count` (number of occurrences).
- `BookingService.createRecurring()` generates all occurrences up front, validates each for conflicts, and creates them atomically (all-or-nothing: if any occurrence conflicts, none are created).
- Each generated booking stores a `recurrenceGroupId` so they can be managed as a set.
- `cancelRecurring()` cancels all bookings in a recurrence group.

**Why all-or-nothing**: A recurring booking that partially succeeds is confusing. If Tuesday's slot is taken, the user should know before any bookings are created.

## Test Strategy

Comprehensive tests cover:

1. **Validation**: empty title, start >= end
2. **Room existence**: booking a nonexistent room
3. **Conflict detection (the bug)**: exact overlap, partial overlap (start-overlapping, end-overlapping), enclosing range, enclosed range, adjacent-but-non-overlapping (should succeed)
4. **Successful creation**: happy path
5. **Cancellation**: valid cancel, cancelling nonexistent booking
6. **Recurring bookings**: daily creation, weekly creation, conflict in any occurrence rejects all, cancelling a recurrence group

All tests mock `db` to isolate business logic from persistence.

## Files Changed

| File | Change |
|------|--------|
| `src/db.ts` | Updated `findByRoomAndTime` to use overlap logic; added `findByRecurrenceGroup` |
| `src/models/room.ts` | No changes |
| `src/errors/index.ts` | No changes |
| `src/services/bookingService.ts` | Fixed conflict check, added `Booking.recurrenceGroupId`, added `RecurrenceRule`, `createRecurring()`, `cancelRecurring()` |
| `src/__tests__/bookingService.test.ts` | New comprehensive test file |
