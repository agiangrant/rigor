# Repository Pattern Refactoring Analysis

## Current State

Both `RoomService` and `BookingService` directly import and use the `db` object from `../db`. This creates tight coupling between business logic and the data access layer, making the services:

- Hard to test without mocking the `db` module globally (`vi.mock('../db')`)
- Impossible to swap data sources without changing service code
- Inconsistent with the repository pattern the task asks us to adopt

### Direct DB Access in RoomService

- `db.rooms.findById(id)` in `getById`
- `db.rooms.create(...)` in `create`
- `db.rooms.findAll()` in `listAll`

### Direct DB Access in BookingService

- `db.rooms.findById(input.roomId)` in `create` (cross-aggregate access)
- `db.bookings.findByRoomAndTime(...)` in `create`
- `db.bookings.create(input)` in `create`
- `db.bookings.findByRoom(roomId)` in `getByRoom`
- `db.bookings.findById(bookingId)` in `cancel`
- `db.bookings.delete(bookingId)` in `cancel`

## Approach

### 1. Define Repository Interfaces

Create two repository interfaces that abstract the data access methods each service needs:

- **`RoomRepository`** -- `findById`, `findAll`, `create`
- **`BookingRepository`** -- `findById`, `findByRoom`, `findByRoomAndTime`, `create`, `delete`

These interfaces mirror the shape of the existing `db` sub-objects but are explicit TypeScript interfaces that can be implemented by any backing store.

### 2. Inject Repositories via Constructor

Each service receives its repository (or repositories) through its constructor:

- `RoomService` takes a `RoomRepository`
- `BookingService` takes both a `BookingRepository` and a `RoomRepository` (it needs to verify room existence)

This is standard constructor injection -- no DI framework needed.

### 3. Create Default Implementations

Provide `DbRoomRepository` and `DbBookingRepository` classes that wrap the existing `db` object, so existing call sites can construct services with the real database unchanged.

### 4. Update Tests

Tests now construct services with mock/stub repository objects directly, eliminating the need for `vi.mock('../db')`. This makes tests more explicit about what they depend on and easier to reason about.

## Design Decisions

1. **Interfaces, not abstract classes** -- TypeScript interfaces are erased at runtime and impose zero overhead. They're the right tool for defining contracts.

2. **BookingService depends on RoomRepository** -- The booking creation flow validates that the target room exists. Rather than duplicating a `findRoomById` on the booking repository, we inject a `RoomRepository` as a second dependency. This keeps each repository focused on its own aggregate.

3. **Booking model extracted to its own file** -- The `Booking` interface was previously defined inline in `bookingService.ts`. Moving it to `models/booking.ts` follows the existing pattern (`models/room.ts`) and allows the repository interface to reference it without circular imports.

4. **Preserved the existing bug comment** -- The original code has a comment noting that conflict checking only does exact match, not overlapping range detection. This is a known issue in the original code and is out of scope for this refactoring. The comment is preserved as-is.

## File Changes Summary

| File | Change |
|------|--------|
| `src/models/booking.ts` | New -- extracted Booking interface |
| `src/repositories/roomRepository.ts` | New -- RoomRepository interface + DbRoomRepository |
| `src/repositories/bookingRepository.ts` | New -- BookingRepository interface + DbBookingRepository |
| `src/repositories/index.ts` | New -- barrel export |
| `src/services/roomService.ts` | Refactored -- constructor injection of RoomRepository |
| `src/services/bookingService.ts` | Refactored -- constructor injection of BookingRepository + RoomRepository |
| `src/__tests__/roomService.test.ts` | Refactored -- uses mock repository instead of vi.mock |
| `src/__tests__/bookingService.test.ts` | New -- tests for BookingService with mock repositories |

## Review Notes

- The refactoring is behavior-preserving: all public method signatures remain identical.
- The only breaking change is that service constructors now require repository arguments. Any code that does `new RoomService()` must be updated to `new RoomService(new DbRoomRepository())`. This is intentional -- it makes the dependency explicit.
- Default implementations (`DbRoomRepository`, `DbBookingRepository`) keep migration incremental.
