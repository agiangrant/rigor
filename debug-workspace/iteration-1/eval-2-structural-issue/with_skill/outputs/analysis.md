# Debug Analysis: SMS Notifications Sent Despite User Opt-Out

## 1. Holistic View

The notification service (`notificationService.ts`) is responsible for sending notifications across three channels (email, push, SMS) for five event types (order shipped, payment failed, refund processed, security alert, promotion). Each function independently fetches user data and checks notification preferences before dispatching.

### Intended behavior
- Users control which channels they receive notifications on via `notificationPrefs`
- Security alerts bypass preferences entirely and send on all available channels
- Promotions skip SMS (cost concern)

### What actually happens
A user who has set `sms: false` still receives SMS messages when a security alert fires, because `notifySecurityAlert` intentionally bypasses all preference checks.

## 2. Root Cause

The root cause is **structural, not a typo**. There are two intertwined problems:

### Problem A: No separation between notification importance and channel preferences

`notifySecurityAlert` hardcodes the policy "security = all channels always" by simply skipping the preference checks. But user channel preferences (especially SMS, which costs the user money) represent a stronger contract than the system realizes. A user who disables SMS is not saying "don't bother me with low-priority stuff" -- they may be saying "I cannot afford SMS messages."

The code conflates two independent axes:
- **Notification priority/importance** (security alert vs. promo)
- **Channel delivery preferences** (user's explicit opt-in/opt-out per channel)

There is no model for "this is important, try harder to reach the user" that still respects hard channel opt-outs.

### Problem B: Copy-pasted dispatch logic (structural amplifier)

Every notification function duplicates the same pattern:
1. Fetch order (if applicable)
2. Fetch user
3. Check prefs for each channel
4. Send

This is repeated 5 times with slight variations. With 3 more notification types next sprint and 2 more channels (WhatsApp, Slack) in Q3, this will become 8 functions x 5 channels = 40 conditional blocks, each a potential site for the same class of bug.

## 3. Fix Scope: Structural Fix Required

This is not a bandaid situation. Signs pointing to a deeper fix:
- The "fix" of just adding pref checks to `notifySecurityAlert` would work for this bug, but leaves the copy-paste structure intact for the next 3 notification types to get wrong
- Adding WhatsApp and Slack channels means touching every function
- The same pattern has already produced one policy variation (promos skip SMS) that's encoded as a code comment rather than data

### Options

**Option A: Minimal -- Just respect SMS prefs in security alerts**
- Add `if (user.notificationPrefs.sms && user.phone)` check to `notifySecurityAlert`
- Pro: Smallest change, lowest risk
- Con: Doesn't address the structural problem. Next sprint's 3 new notification types will copy-paste the same pattern. WhatsApp/Slack in Q3 means editing every function.

**Option B: Extract a dispatch function with a priority/override model**
- Create a `dispatchNotification(user, channels, message, options?)` function
- Notification types declare which channels they want; dispatch checks prefs
- Add an `overridePrefs` flag or priority level for security alerts that can override *some* prefs (e.g., always email, but respect SMS opt-out)
- Pro: Single place to enforce channel logic. Adding new channels or notification types becomes declarative.
- Con: Moderate refactor. Need to decide the override policy.

**Option C: Full notification pipeline with priority tiers and channel routing**
- Notification types become data (priority, channels, templates)
- Channel routing is a separate concern (check prefs, check availability, apply overrides)
- Pro: Scales cleanly to 8+ notification types and 5+ channels. Policy is explicit and testable.
- Con: Largest change. Possibly over-engineered for current scale, but justified given the Q3 roadmap.

### Recommendation

**Option B**. It solves the immediate bug, eliminates the copy-paste, and provides a clean extension point for the upcoming notification types and channels. It's the right amount of structure for where this system is headed without over-engineering.

For the security alert policy specifically: security alerts should override preferences for email and push (free channels the user has set up), but **respect the user's SMS opt-out**. SMS costs the user money -- overriding that preference is a different kind of decision than sending an extra push notification. If the product team disagrees and wants SMS to be forced for security, that should be an explicit, conscious product decision -- not a side effect of skipping all pref checks.

## 4. The Fix

Extract a `sendNotification` helper that:
1. Accepts user, message details, and a channel config (which channels to attempt, whether to override prefs)
2. Checks preferences per-channel (unless explicitly overridden for that specific channel)
3. Checks availability (phone exists, deviceToken exists)

Each notification function becomes a thin wrapper that calls `sendNotification` with the right config.

For security alerts: override email and push prefs (free, important), but respect SMS prefs (costs user money). This is surfaced as an explicit policy choice in the code rather than an implicit omission.

## 5. Regression Test Strategy

- Test: user with `sms: false` does NOT receive SMS on security alert
- Test: user with `sms: true` DOES receive SMS on security alert
- Test: user with `sms: false` does NOT receive SMS on order shipped
- Test: security alerts still send email regardless of email pref (override behavior)
- Test: security alerts still send push regardless of push pref (override behavior, if deviceToken exists)
- Test: promotions never send SMS regardless of prefs
