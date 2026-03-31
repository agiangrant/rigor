---
name: rigor:code-review
description: Use when reviewing code changes before approving or merging, when other skills reference /rigor:code-review for verification, after completing a feature or bugfix, or when asked to review a PR or diff. This is a strict, objective review — it flags real problems, not style preferences.
---

# Code Review

## Philosophy

A code review is not a rubber stamp. It's not a place for encouragement. It exists to catch problems before they reach production — problems in correctness, design, maintainability, and test coverage. The codebase's long-term health matters more than the author's feelings about a particular commit.

Be direct. Be specific. Be constructive. If something is wrong, say it's wrong and explain why. If something will cause problems later, flag it now. If something is fine, move on — don't waste time with "looks good" commentary on code that's simply doing its job.

You are reviewing the code, not the person. Every finding should be objective, actionable, and tied to a concrete concern (correctness, performance, maintainability, testability, security). "I don't like this" is not feedback. "This duplicates logic from X and will drift over time" is feedback.

## The Review

You MUST cover all of these areas. Do not skip sections because the code "looks fine." A thorough review means actively looking for problems, not waiting for them to jump out.

### 1. Understand the Context

Before reviewing the code itself, understand what it's doing and why:

- **What problem does this solve?** Read the PR description, linked issues, or commit messages. If the context isn't clear, flag that as the first finding — code without clear intent is code nobody can maintain.
- **What's the scope?** Is this a bugfix, a new feature, a refactor? The scope determines what to focus on. A bugfix should be minimal and tested. A new feature should be well-structured and not paint the codebase into a corner. A refactor should leave no dead code.
- **What did the code look like before?** Read the diff against the base, not just the final state. What was added, removed, and modified? Changes that look reasonable in isolation may be wrong in context.

### 2. Correctness

Does the code do what it claims to do?

- **Logic errors**: Off-by-ones, wrong comparisons, missing edge cases, incorrect boolean logic, race conditions.
- **Error handling**: Are errors caught and handled appropriately? Are error messages actionable? Are there failure paths that silently swallow errors or return misleading results?
- **Boundary conditions**: What happens with empty inputs, null values, maximum values, concurrent access? If the code doesn't handle these and they can realistically occur, flag it.
- **Contract violations**: Does the code honor the contracts of the APIs it calls? Does it maintain the contracts of the APIs it exposes? Changed return types, changed error behavior, and changed side effects are all breaking changes even if the type signature hasn't changed.

### 3. Design and Architecture

Does this code make the codebase better or worse?

- **Duplication**: Search for existing implementations of similar logic elsewhere in the codebase. Domain logic that's duplicated will drift — one copy gets updated, the other doesn't, and now there are two sources of truth. Flag any duplication and recommend extraction or reuse unless the project has an established pattern of intentional duplication (some languages and frameworks favor this — Go interfaces, for example).
- **Responsibility placement**: Is this code in the right place? Does it belong in this module, this layer, this service? Code that reaches across module boundaries or violates the established layering is a maintenance problem waiting to happen.
- **Abstraction level**: Is the abstraction appropriate? Too abstract and the code is hard to follow. Too concrete and it can't be reused or tested. Neither extreme is good — flag both.
- **Forward compatibility**: Will this code accommodate the known next steps, or will the next feature require tearing it apart? This isn't about speculative design — it's about not building walls in front of doors you know you need to walk through.
- **Dependencies**: Does this introduce new dependencies? Are they justified? Does the dependency pull in more than what's needed? Is the dependency maintained and appropriate for the project's constraints?

### 4. Test Coverage

Are the tests adequate? Not "do tests exist" — are they actually protecting against regressions?

- **Happy path coverage**: Are the primary success cases tested?
- **Failure mode coverage**: Are realistic failure scenarios tested? Bad input, missing data, unavailable dependencies, business rule violations? A test suite with only happy paths is a false sense of security.
- **Integration coverage**: If the code interacts with external systems (database, APIs, file system), are there integration tests that verify the interaction works? Mocked unit tests don't catch query errors, serialization mismatches, or constraint violations.
- **Test quality**: Do the tests actually assert meaningful things? A test that calls a function and asserts `expect(result).toBeDefined()` proves nothing. Tests should assert specific behavior and specific values.
- **Missing tests**: If there are code paths without test coverage, flag them explicitly. "This error path on line 47 is not tested" is actionable. "Needs more tests" is not.

### 5. Code Quality

Is this code that a future developer (including the author in 6 months) can understand and maintain?

- **Naming**: Do names accurately describe what things do? Misleading names are worse than bad names — they actively create misunderstandings.
- **Complexity**: Are there functions that do too many things? Deeply nested conditionals? Long parameter lists? Complex code should be simplified or, if the complexity is inherent, well-documented.
- **Dead code**: Is there code that's unreachable, commented out, or unused? Dead code is noise. It confuses readers and creates false dependencies.
- **Consistency**: Does the code follow the project's established patterns? Inconsistency creates cognitive load — readers have to figure out whether the difference is intentional or accidental.
- **Security**: SQL injection, XSS, command injection, insecure deserialization, hardcoded secrets, overly permissive CORS. If any of these are present, flag them as blocking.

### 6. Light Fixes

If during the review you identify issues that are:
- **Absolutely certain** to be correct
- **Safe** — cannot break anything or change behavior in unexpected ways
- **Self-contained** — don't require changes elsewhere

Then apply them directly. Examples: fixing a typo in an error message, removing an unused import, correcting a misleading comment. These are not opinions — they are objective improvements with zero risk.

Do NOT apply light fixes for anything that:
- Changes behavior (even "obviously correct" behavior changes need explicit approval)
- Requires changes in other files
- Is a style preference rather than an objective improvement
- You're not 100% certain about

When in doubt, flag it as a finding instead of fixing it.

## Presenting Findings

Structure findings by severity:

**Blocking** — Must be fixed before merge. Correctness bugs, security vulnerabilities, missing critical tests, broken contracts.

**Should Fix** — Strongly recommend fixing now. Duplication that will drift, design issues that will compound, missing failure mode tests, code that will be hard to change next sprint.

**Consider** — Worth discussing. Alternative approaches that might be better, potential future problems that aren't urgent, minor inefficiencies. Present these as options with trade-offs, not demands.

For each finding:
- **What**: State the problem concretely. Reference specific lines or code.
- **Why**: Explain why it's a problem. Not "this is bad" — explain the consequence (data corruption, maintenance burden, silent failure, performance degradation).
- **How**: Suggest a fix or present options. Don't just point at problems — point toward solutions.

Do NOT include:
- "Looks good!" commentary on code that's simply adequate
- Style preferences disguised as findings
- Praise for doing basic things correctly
- Findings that amount to "I would have done this differently" without a concrete reason why the current approach is problematic

## Composability

This skill is referenced by:
- `/rigor:debug` — for verifying fixes on non-trivial changes
- `/rigor:refactor` — for reviewing the full diff after structural changes

This skill references:
- `/rigor:tdd` — for evaluating test adequacy
- `/rigor:code-structure` — for evaluating file placement and module organization
