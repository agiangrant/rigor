# Analysis: Adding SMS and Multi-Channel Notification Support

## Existing Code Review

### Package `notification`
- Defines a `Sender` interface with `Send(to, subject, body string) error`
- Provides `EmailSender` as the sole implementation
- Clean interface-based design that's ready for extension

### Package `user`
- Simple `User` struct with `ID`, `Email`, `Name`, `Phone` fields
- `Phone` field already exists, which SMS will use

### Module
- `github.com/example/notifier`, Go 1.22
- No external dependencies

## Design Decisions

### 1. SMSSender
Added to the `notification` package alongside `EmailSender`. Implements the existing `Sender` interface. Holds Twilio credentials (Account SID, Auth Token, From number) as struct fields. The `subject` parameter is ignored for SMS since SMS has no subject concept -- only `body` is sent.

### 2. MultiSender
A composite `Sender` that fans out to multiple underlying senders. Collects all errors and returns them joined. This follows the decorator/composite pattern rather than creating a new interface, keeping it composable with anything that accepts `Sender`.

### 3. NotificationService
Lives in the `notification` package. Accepts a `User` and routes to the correct channels based on `UserPreferences`. Owns a map of channel name to `Sender`, so channel configuration is decoupled from routing logic.

### 4. UserPreferences
Added to the `user` package as a `Preferences` field on `User`. Contains `Channels []string` to declare which channels the user wants (e.g., `["email", "sms"]`). This keeps preference data with the user rather than in the notification package.

### 5. Error Handling
`MultiSender` and `NotificationService` use `errors.Join` (Go 1.20+) to aggregate errors from multiple sends. This preserves all failure information rather than failing fast on the first error.

## Files Changed

| File | Change |
|------|--------|
| `user/user.go` | Added `Preferences` struct and field on `User` |
| `notification/notification.go` | Added `SMSSender`, `MultiSender`, `NotificationService` |
| `notification/notification_test.go` | Tests for all new types |
