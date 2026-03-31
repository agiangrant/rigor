# Bug Analysis: SMS notifications sent despite user opt-out

## Root Cause

The bug is in `notifySecurityAlert` (lines 69-80 of `notificationService.ts`). This function sends notifications to **all channels unconditionally**, completely ignoring `user.notificationPrefs`. The comment on line 72 explicitly states this was intentional: "Security alerts always go to all channels regardless of prefs."

This design decision directly causes the reported bug: users who set `sms: false` still receive SMS messages when a security alert fires.

## Why This Is Wrong

Even if the product intent is "security alerts should be hard to miss," overriding an explicit user preference to not receive SMS violates user trust and, in this case, costs the user money (limited SMS plan). The correct approach is to respect channel preferences while ensuring the user is notified through at least one channel they have enabled.

## Structural Problem

Beyond the immediate bug, the codebase has a deeper structural issue: preference-checking logic is copy-pasted into every notification function. Each function independently implements the same if/send pattern for each channel. This means:

1. **Every new notification type** requires re-implementing the same preference checks (3 more types coming next sprint).
2. **Every new channel** (WhatsApp, Slack planned for Q3) requires editing every existing function.
3. **Bugs like this one** are easy to introduce -- one function deviates from the pattern and nobody catches it.

The fix should both resolve the immediate bug and extract the duplicated logic into a shared helper.

## Affected Functions

| Function | Respects prefs? | Issue |
|---|---|---|
| `notifyOrderShipped` | Yes | None |
| `notifyPaymentFailed` | Yes | None |
| `notifyRefundProcessed` | Yes | None |
| `notifySecurityAlert` | **No** | Sends to all channels unconditionally |
| `notifyPromotion` | Partial | Correctly omits SMS (by design) |

## Fix Summary

1. Extract a `sendNotification(user, message, options?)` helper that checks preferences and dispatches to enabled channels.
2. Have all notification functions call the helper instead of duplicating the logic.
3. For security alerts, use the same helper (respecting prefs) but add a fallback: if no channels are enabled, send via email as a mandatory fallback, since the user must be reachable for security events.
4. For promotions, the helper accepts a channel exclusion list to skip SMS.
