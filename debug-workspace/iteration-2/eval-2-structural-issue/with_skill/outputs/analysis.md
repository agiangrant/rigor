# Debug Analysis: SMS Notifications Sent Despite Disabled Preferences

## Step 1: Holistic View

The notification service (`notificationService.ts`) sends notifications across three channels (email, push, SMS) for five event types (order shipped, payment failed, refund processed, security alert, promotion). User preferences (`NotificationPrefs`) should control which channels are active per user.

The reported bug: users with `sms: false` still receive SMS when a security alert fires.

## Step 2: Data and Context

### Direct cause

`notifySecurityAlert` (lines 69-80) deliberately bypasses all preference checks. The comment on line 72 says: "Security alerts always go to all channels regardless of prefs." This means any user with a phone number on file receives SMS for security events, regardless of their `sms: false` preference.

This is not an accidental omission -- it was a design decision. But it's a decision that violates user expectations and, in this case, costs the user money on a limited SMS plan.

### Structural issue

Beyond the immediate bug, the codebase has a deeper problem: **the preference-checking logic is duplicated in every notification function**. Each function independently decides whether to check prefs and how to check them. There is no single point of control for "should this notification go to this channel for this user?"

This matters because:
- The bug report notes **3 more notification types** are coming next sprint
- Engineering wants to add **WhatsApp and Slack channels** in Q3
- Every new type x channel combination will copy-paste the same pattern
- The security alert bypass proves that without a centralized policy, individual functions will make ad-hoc decisions that violate user preferences

## Step 3: Fix Scope -- This Is Structural

This is not a one-line fix. The signs:
1. The "fix" for just security alerts (add pref checks) only fixes one function -- the same pattern will recur with every new notification type
2. The copy-paste structure means the next developer adding "delivery updates" will copy an existing function, and may copy the wrong one
3. Adding 2 new channels (WhatsApp, Slack) means touching every function, multiplying the duplication
4. There is a legitimate design tension: some notifications (security) may warrant different delivery rules than others (promos)

## Step 4: Options

### Option A: Minimal fix -- Add pref checks to `notifySecurityAlert`

Add `if (user.notificationPrefs.sms && user.phone)` to the security alert function (and same for other channels).

- **Pros**: Smallest change, lowest risk, fixes the reported bug immediately
- **Cons**: Does not address the structural duplication. The next notification type will copy-paste again. Adding WhatsApp/Slack means modifying every function. Another function can bypass prefs the same way in the future.
- **Cost**: Low now, high over time

### Option B: Extract a `sendToUser` dispatcher that centralizes channel routing (Recommended)

Create a single function that takes a user, a notification type/priority, and message content, then routes to the correct channels based on user prefs. Individual notification functions compose messages but delegate delivery to the dispatcher.

Introduce a priority/category concept: `critical` notifications (security) can have different *default* behavior (e.g., always send email, flag the event) but still respect explicit user opt-outs for channels like SMS that cost money.

- **Pros**: Single point of control for preference checking. Adding a new channel means changing one place. Adding a new notification type means writing a message composer, not re-implementing routing. Prevents future pref-bypass bugs by design.
- **Cons**: Larger change. Requires deciding on the priority/category model now.
- **Cost**: Moderate now, low over time

### Option C: Full notification pipeline with registry

Build a notification registry where notification types are declared with metadata (priority, allowed channels, templates), and a pipeline processes them through preference filtering, channel routing, and delivery.

- **Pros**: Maximum extensibility for the Q3 channel additions and growing type list
- **Cons**: Over-engineered for the current 5 types and 3 channels. YAGNI until the scale actually demands it.
- **Cost**: High now, lowest over time (but only if scale materializes)

## Recommendation

**Option B**. It fixes the bug, prevents the class of bug from recurring, and right-sizes the architecture for the known near-term growth (3 types next sprint, 2 channels in Q3) without over-engineering.

The key design decision in Option B: **critical notifications should still respect explicit user opt-outs**. A user who disables SMS has made a deliberate choice. Security alerts should ensure *some* channel reaches the user (fall back to email, which has no per-message cost), but should not override an explicit SMS opt-out. This respects the user's preference while still fulfilling the security notification obligation.

## Root Cause Summary

| Aspect | Detail |
|--------|--------|
| **Immediate cause** | `notifySecurityAlert` bypasses all preference checks |
| **Structural cause** | No centralized channel routing; each function independently decides whether/how to check prefs |
| **Design gap** | No concept of notification priority that interacts with user preferences in a principled way |
