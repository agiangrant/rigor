---
name: rigor:refactor
description: Use when performing high-impact or non-trivial refactors — restructuring modules, extracting subsystems, changing abstractions, moving responsibilities between components, or any change that reshapes how code is organized without changing external behavior. Also use when a "simple rename" turns out to touch many files, or when you realize the current structure can't support what's being built.
---

# Refactor

## Philosophy

A refactor reshapes the architecture. Done well, it opens the path for the next six months of development. Done poorly, it trades one corner for another — or worse, leaves the codebase in a half-migrated state where two systems exist for the same thing and neither is complete.

The temptation during a refactor is to start moving code immediately. Resist this. A refactor without a clear picture of where you're going is just rearranging furniture in the dark. You might end up somewhere better, or you might block the doorway.

Your job is to understand the full scope, surface the options, and then execute completely — no half-migrations, no dead code left behind, no tests that still reference the old structure.

## The Steps

You MUST follow these steps in order. Do not start moving code before completing the analysis. A refactor that starts without a plan often ends without finishing.

### 1. Understand What Exists

Before changing anything, build a complete picture of what you're working with:

- **Map the current structure**: What modules, files, and abstractions are involved? What are the dependency relationships between them?
- **Identify all consumers**: Who imports, calls, or depends on the code being refactored? This includes tests, configuration, scripts, and documentation — not just production code.
- **Understand the history**: Why does the current structure exist? It may look wrong but serve a purpose you don't see yet. Check git history, comments, and documentation for context.
- **Measure the blast radius**: How many files, modules, and tests will this refactor touch? This informs whether you're dealing with a contained change or a cross-cutting migration.

The goal is to answer: **what exactly am I changing, what depends on it, and why is it the way it is?**

### 2. Define the Target State

Before moving anything, articulate where you're going:

- What does the code look like when the refactor is complete?
- What are the new module boundaries and responsibilities?
- How do the dependency relationships change?
- Does this target state support the known future direction, or does it just solve today's problem?

A refactor that only solves today's problem is a refactor you'll redo in three months. Think about what's being built next and whether the target state accommodates it. This doesn't mean over-engineering — it means not refactoring into another corner.

### 3. Surface Options — Do Not Silently Pick a Direction

This step is MANDATORY for any non-trivial refactor. NEVER silently choose a refactoring direction when reasonable alternatives exist. The human needs to see the options before code starts moving.

This applies even when the user gives partial direction. "Extract auth into its own service" tells you the high-level goal, but it does not tell you where the boundaries fall. Which methods go where? Does password management belong with auth or with user management? Does session validation stay with auth or become middleware? These are the decisions that matter most — and they're exactly the ones that get made silently when you skip this step.

**The rule: if the refactor involves splitting, moving, or reassigning responsibilities, surface the boundary decisions as explicit options.** A user saying "split X from Y" is telling you *what* to separate, not *where every piece lands*.

Present:
- **The options**: At least two viable decompositions, each with a concrete description of what goes where and why
- **Trade-offs for each**: Complexity, coupling between the new modules, how well each split supports known future work, and what changes if you need to add related functionality later
- **Boundary rationale**: For each option, explain which responsibilities land where and what principle drives the grouping (cohesion, ownership of data, dependency direction, etc.)
- **What gets cleaned up**: Which old code, tests, and configuration gets removed or rewritten in each option
- **Your recommendation**: Which option you'd choose and why — but the human decides

Use `/rigor:code-structure` when the refactor involves creating new files or directories, or moving code to new locations. The structural decisions compound — get them right before executing.

Use `/rigor:architecture-decisions` when the refactor changes system boundaries, data flow, or component responsibilities.

Do NOT start implementation until the human has confirmed the direction. Present your analysis, present the options, and wait.

### 4. Execute Completely — No Half-Migrations

Once the direction is confirmed, execute the full refactor. This means:

**Move code to its new home.** Use `/rigor:code-structure` for placement decisions on new files.

**Update every consumer.** Every import, every reference, every call site. Do not leave old paths working "for backwards compatibility" unless explicitly told to maintain them. Grep for the old names, old paths, old patterns — anything you miss becomes tech debt that someone else has to clean up.

**Remove the old code.** When code moves to a new location, delete it from the old location. When an abstraction is replaced, remove the old abstraction. When a module is split, remove the original monolith. NEVER leave dead code behind. The old version is in git history if anyone needs it — it does not need to live in the codebase.

This applies to everything:
- Old files and directories that have been superseded
- Unused imports and exports
- Barrel file entries that point to removed code
- Configuration and environment variables that referenced the old structure
- Documentation that describes the old layout

If you are uncertain whether something is still used, verify before deleting. But "it might be used" is not a reason to keep dead code — it's a reason to check.

### 5. Refactor the Tests — TDD Is Absolutely Mandatory

Tests are not an afterthought in a refactor. They are the safety net that proves the refactor didn't break anything and the guarantee that the new structure works as intended.

Follow `/rigor:tdd`. The test changes must be as thorough as the code changes:

- **Move tests** that correspond to moved code. Tests should live wherever the project's convention places them relative to the code they test.
- **Update tests** that referenced old module paths, old function signatures, or old abstractions. Every test must reference the new structure.
- **Add tests** for new abstractions, new module boundaries, or new behavior that the refactor introduces. If the refactor creates a new service by extracting from an old one, that new service needs its own tests.
- **Remove tests** that test code that no longer exists. Dead tests are as bad as dead code — they create confusion about what the system actually does and slow down the test suite.
- **Run the full test suite** after the refactor. Not just the tests you touched — the full suite. A refactor that passes its own tests but breaks something downstream is incomplete.

A refactor is not done until the tests are green and they reflect the new reality.

### 6. Verify Completeness

Before declaring the refactor complete:

- Grep for references to old module names, old file paths, old function names. There should be zero.
- Verify no dead code remains — no unused files, no orphaned exports, no commented-out old implementations.
- Run the full test suite.
- Check that the resulting structure matches the target state from step 2.

Use `/rigor:code-review` on the full diff if the refactor is large.

## Anti-Patterns

If you catch yourself doing any of these, STOP and reassess.

| What you're doing | What you should do instead |
|---|---|
| Moving code to a new location but keeping the old version "just in case" | Delete the old version. It's in git. |
| Creating a new abstraction without removing the old one | The refactor isn't done until the old abstraction is gone |
| Updating some consumers but leaving others on the old path | Update all consumers or don't start the refactor |
| Leaving tests that import from old paths with `// TODO: update` | Update them now. There is no later. |
| Refactoring the code but not the tests | Tests are part of the refactor. They change together. |
| Starting to move code before agreeing on the direction | Go back to step 3. Surface the options first. |
| Treating "split X from Y" as a complete specification | The user told you *what* to separate, not *where every piece goes*. Surface the boundary decisions. |
| Solving only today's problem without considering known future work | Go back to step 2. Define a target state that doesn't paint you into a corner. |
| Adding a compatibility shim between old and new | Unless explicitly told to maintain backwards compatibility, just migrate |

## Composability

This skill composes with:
- `/rigor:code-structure` — for placement decisions when the refactor creates new files or directories
- `/rigor:architecture-decisions` — when the refactor changes system boundaries or component responsibilities
- `/rigor:tdd` — for the mandatory test discipline throughout the refactor
- `/rigor:debug` — when a refactor surfaces bugs in the existing code (fix them properly, don't carry them forward)
