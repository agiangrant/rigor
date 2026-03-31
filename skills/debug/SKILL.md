---
name: rigor:debug
description: Use when encountering any bug, test failure, or unexpected behavior — before proposing fixes. Also use when a "quick fix" temptation arises, when the same area of code has broken before, or when the root cause isn't immediately obvious.
---

# Debug

## Philosophy

Bugs are symptoms. Your job is to find the disease, not suppress the fever.

The natural instinct when something breaks is to zoom into the failing line and patch it. Resist this. A fix applied without understanding the full picture is a bandaid — and bandaids get revisited every two weeks for the next ten years. One proper fix now is worth more than a dozen quick patches over time.

## The Steps

You MUST follow these steps in order. Do not skip ahead. Do not jump to a fix before completing the analysis. The sequence exists because each step builds understanding that prevents wrong fixes.

### 1. Step Back — Get the Holistic View

Before touching code, build a mental model of what *should* be happening. You already have context from the current conversation — don't throw it away, but don't let it tunnel your vision either.

Ask yourself:
- What is the intended behavior of this system/feature/flow?
- What are the data sources involved and where do they originate?
- What is the execution context — who calls this, when, with what state?
- Where does this sit in the broader architecture?

Map the flow from input to output. The bug lives somewhere along that path, and understanding the full path prevents you from fixing the wrong thing.

### 2. Think in Data and Context, Not Lines

Before pinpointing specific lines of code, understand:
- **Data sources**: Where does the data come from? Database, API, user input, cache, derived state? Is the data itself wrong, or is it being mishandled?
- **Execution context**: Is this running in a request handler, a background job, a test harness, a migration? What assumptions does the surrounding context make?
- **State transitions**: What state existed before the bug manifests? What changed?

This framing often reveals that the bug isn't where the error appears — it's upstream in the data pipeline or in an incorrect assumption about context.

### 3. Determine Fix Scope — Bandaid or Real Solution?

Once you understand the root cause, evaluate honestly:

**If the fix is truly straightforward** — a clear typo, an off-by-one, a missing null check at a boundary where null legitimately shouldn't propagate further — apply it directly. Not every bug signals a structural problem. Go to step 5.

**If you're not certain it's straightforward** — assume something is fundamentally or structurally incorrect. This is the more common case. Signs that a deeper fix is needed:
- The "fix" requires suppressing or working around behavior rather than correcting it
- The same area has broken before (or you suspect it will break again)
- The fix only works for this specific case but similar cases would still fail
- You're adding a special case to handle something that should be handled generally
- The root cause is a leaky abstraction, a wrong data model, or an incorrect assumption baked into the design

If any of these signs are present, you MUST go to step 4. Do not silently choose an approach.

### 4. Surface Ambiguity — No Silent Architecture Decisions

This step is MANDATORY when the fix is not straightforward. NEVER silently pick an approach when reasonable alternatives exist. The human needs to see the options to make an informed decision.

Present:
- **The options**: What are the viable approaches? Always present at least two. Think through three.
- **Trade-offs for each**: What does each option cost in complexity, risk, migration effort, and long-term maintenance?
- **Your recommendation**: Which option you'd choose and why — but the human decides.

Use `/rigor:architecture-decisions` when the structural change affects system boundaries, data flow, or component responsibilities.

Scan other available skills for patterns that might inform the options. The right fix might involve a pattern that another skill handles well.

Do NOT proceed to implementation until the human has weighed in on the approach. Present your analysis, present the options, and wait.

### 5. Fix It Right — TDD Is Mandatory

Every fix MUST be covered by a regression test. We don't want to see this bug again.

Follow `/rigor:tdd` — write the failing test that reproduces the bug *before* writing the fix. This order is non-negotiable:

1. **Write the failing test first.** This proves you actually understand the bug. If you can't reproduce it in a test, you don't understand it yet.
2. **Run the test — confirm it fails.** A test that doesn't fail before the fix proves nothing.
3. **Write the fix.**
4. **Run the test — confirm it passes.**

Get it right the first time. A well-tested fix that took longer is always better than a quick patch that "seems to work."

### 6. Verify the Fix in Context

After the fix passes its test, zoom back out:
- Does the fix make sense in the broader system?
- Could it affect other callers, consumers, or downstream behavior?
- Run the full relevant test suite, not just the new test

Use `/rigor:code-review` on your own fix if the change is non-trivial.

## Anti-Patterns

These are signs you're about to apply a bandaid. If you catch yourself doing any of these, STOP and go back to step 3.

| What you're doing | What you should do instead |
|---|---|
| Adding a try/catch to suppress an error | Find out why the error occurs and fix the cause |
| Adding a nil/null check deep in a call chain | Find where the nil originates and prevent it |
| Adding a special case for "this one scenario" | Generalize the handling or fix the model |
| Copying logic to handle a variant | Abstract the common pattern |
| "It works now" without understanding why | Keep investigating — accidental fixes are time bombs |
| Fixing the symptom because the root cause is "too much work" | Surface the scope and let the human decide — that's not your call |
| Jumping straight to a fix without analysis | Go back to step 1 — you skipped the diagnosis |
| Picking one approach when multiple exist | Go to step 4 — surface the options |
