# Notification System Analysis

## Task

Add a notification system to the booking app that:
- Notifies room owners when a booking is created
- Sends cancellation confirmations to bookers
- Supports email now, Slack eventually

## Current Architecture

The existing codebase has:
- **Models**: `Room` interface (id, name, capacity, floor, amenities) -- notably missing an `ownerEmail` field
- **Services**: `BookingService` (create, getByRoom, cancel) and `RoomService` (getById, create, listAll)
- **DB**: Stub database layer with rooms and bookings collections
- **Errors**: Custom error hierarchy (AppError, NotFoundError, ValidationError, ConflictError)
- **Booking interface**: Has roomId, userId, startTime, endTime, title -- no user email

## Key Design Decisions

### 1. Notification Channel Abstraction

Use a `NotificationChannel` interface so email and Slack (future) are interchangeable. Each channel implements `send(notification)`. This avoids coupling business logic to any specific delivery mechanism.

### 2. NotificationService as Orchestrator

A `NotificationService` accepts an array of channels and dispatches notifications through all of them. The booking service calls the notification service -- it doesn't know about email or Slack.

### 3. Event-Based Notification Types

Define explicit notification types (`BookingCreated`, `BookingCancelled`) rather than free-form strings. This gives us type safety and makes it easy to add new notification types later.

### 4. Room Model Extension

The `Room` model needs an `ownerEmail` field so we know who to notify on booking creation. The `Booking` model similarly needs a `userEmail` for cancellation confirmations. Rather than modifying original files, we extend the types in new files.

### 5. Fire-and-Forget Notifications

Notification failures should not break booking operations. The notification service catches errors and logs them rather than propagating them to callers. A booking should succeed even if the email fails.

## File Structure

```
outputs/
  src/
    notifications/
      types.ts              - Notification and channel type definitions
      notificationService.ts - Orchestrator that dispatches to channels
      emailChannel.ts        - Email channel implementation
      slackChannel.ts        - Slack channel stub (future)
    models/
      booking.ts             - Extended Booking model with userEmail
      room.ts                - Extended Room model with ownerEmail
    services/
      bookingService.ts      - Updated BookingService with notification integration
    __tests__/
      notificationService.test.ts - Tests for notification orchestration
      emailChannel.test.ts        - Tests for email channel
      bookingNotifications.test.ts - Integration tests for booking + notifications
```

## Approach

1. Define notification types and the channel interface
2. Implement the email channel
3. Build the notification service orchestrator
4. Create a stub Slack channel to prove extensibility
5. Integrate notifications into `BookingService` via dependency injection
6. Write tests for each layer
