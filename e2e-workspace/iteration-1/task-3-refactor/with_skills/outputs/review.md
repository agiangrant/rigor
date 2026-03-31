# Code Review — Repository Pattern Refactor

## Context

Refactored `RoomService` and `BookingService` to use repository interfaces via constructor injection instead of importing the `db` module directly. Extracted `Booking` and `CreateBookingInput` types to `src/models/booking.ts`. Created `RoomRepository` and `BookingRepository` interfaces in `src/repositories/`. Updated existing tests and added comprehensive `BookingService` tests.

## Findings

### Blocking

None.

### Should Fix

**1. Pre-existing bug carried forward: overlap detection in BookingService.create (bookingService.ts, line 23)**

The comment `// BUG: only checks exact match, not overlapping ranges` is carried forward from the original code. The `findByRoomAndTime` method semantics are ambiguous — it's unclear whether the db implementation checks for overlaps or exact matches. This is a correctness risk in production.

- **Why it matters:** Double-bookings are the primary failure mode for a booking system. If `findByRoomAndTime` only returns exact matches (same start AND end), any booking with slightly different times will slip through.
- **Recommendation:** This should be tracked as a follow-up. The repository interface contract should document whether `findByRoomAndTime` returns overlapping bookings or exact matches. The implementation should use overlap logic: `existing.start < input.end AND existing.end > input.start`.

**2. CreateRoomInput is defined in roomRepository.ts, not in models (roomRepository.ts, line 3-8)**

`CreateRoomInput` was previously a local interface in `roomService.ts`. It was moved to `roomRepository.ts` because the repository's `create` method needs it as a parameter type. However, this means the input type for creating a room is co-located with the data access interface rather than with the domain model.

- **Why it matters:** If other code (e.g., route handlers, validators) needs `CreateRoomInput`, importing it from a repository file is unintuitive. Models are the expected home for shared types.
- **Recommendation:** Move `CreateRoomInput` to `src/models/room.ts` alongside the `Room` interface, mirroring how `CreateBookingInput` lives in `src/models/booking.ts`. Both the service and repository can import from there.

### Consider

**3. No db-backed repository implementation provided**

The refactor introduces interfaces but does not include a concrete implementation that wraps the existing `db` object. The services are decoupled from `db`, but nothing wires them together.

- **Why it matters:** Without a concrete implementation, the refactored services cannot be instantiated in production code without writing the adapter.
- **Recommendation:** Create `DbRoomRepository` and `DbBookingRepository` classes in `src/repositories/` that implement the interfaces by delegating to the existing `db` object. This completes the refactor — the services use interfaces, and the concrete implementations contain the `db` dependency.

**4. Test helper functions duplicated between test files**

Both `roomService.test.ts` and `bookingService.test.ts` define `createMockRoomRepo()`. If more services are added, this pattern will be duplicated further.

- **Why it matters:** Minor duplication risk. Manageable at this scale, but worth noting.
- **Recommendation:** Consider extracting shared test helpers to `src/__tests__/helpers/` if a third service needs the same mock factories.

**5. Validation ordering in BookingService.create is input-first, then db-checks**

The current ordering validates input fields (title, time range) before checking room existence and booking conflicts. This is correct — cheap validation before expensive I/O. Noting this as a positive design choice to maintain as the service grows.

## Summary

The refactor is structurally sound. The services are cleanly decoupled from the data access layer. Tests use plain object injection instead of module mocking, which makes them faster and easier to reason about. The main actionable item is moving `CreateRoomInput` to the models layer for consistency with `CreateBookingInput`. The overlap detection bug is pre-existing and should be tracked separately.
