# Analysis: SMS Notifications Sent Despite User Preferences

## Bug Location

`notifySecurityAlert` (lines 69-80 of `src/notificationService.ts`) sends notifications to **all channels unconditionally**, ignoring `user.notificationPrefs`. The comment on line 72 makes this explicit: _"Security alerts always go to all channels regardless of prefs."_

This is the direct cause of the reported bug. A user with `sms: false` still receives SMS when a security alert fires.

## Root Cause: Structural

The real problem is not just one function with a wrong policy. It is that every notification function (`notifyOrderShipped`, `notifyPaymentFailed`, `notifyRefundProcessed`, `notifySecurityAlert`, `notifyPromotion`) independently reimplements channel-dispatch logic. There is no shared dispatch function, so:

1. Each function makes its own decision about which channels to use.
2. There is no single place to enforce the invariant "user prefs are always respected."
3. `notifySecurityAlert` diverged from the pattern with no compiler or runtime guard to catch it.
4. `notifyPromotion` also diverges (skips SMS for cost reasons) -- a business rule baked into dispatch logic.

## Why This Matters Beyond the Immediate Fix

The bug report's "Additional context" says:
- 3 more notification types are coming next sprint.
- WhatsApp and Slack channels are planned for Q3.

With the current structure, adding a notification type means copy-pasting the if/send block for every channel. Adding a channel means editing every notification function. This is N x M combinatorial growth with no shared control point.

## Proposed Fix

1. Extract a single `dispatchNotification` function that takes a user, a message (subject + body), and an optional channel override list.
2. `dispatchNotification` always respects `user.notificationPrefs` unless a channel is explicitly force-enabled with a documented override (none needed for the current bug fix).
3. Each `notify*` function builds its message and calls `dispatchNotification`.
4. For security alerts specifically: respect user prefs like every other notification type. If the product team wants security alerts to bypass prefs, that is a product decision that should be made explicitly and documented -- not silently assumed. For now, fix the bug.

## Impact

- Fixes the reported bug immediately.
- Makes the codebase ready for new notification types (one function call, not copy-paste).
- Makes the codebase ready for new channels (one place to add dispatch logic).
- Eliminates the class of bug where one notification type accidentally diverges.
