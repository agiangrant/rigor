---
name: rigor:tdd
description: Use when implementing any feature, bugfix, or refactor — before writing implementation code. Also use when test infrastructure doesn't exist yet (surface options for test framework and structure), when adding tests to untested code, or when other skills reference /rigor:tdd. This skill governs all testing discipline.
---

# TDD

## Philosophy

Tests are not a chore that follows implementation. They are the specification that drives it. Writing the test first forces you to think about what the code should do before you think about how it does it. This catches design mistakes at the cheapest possible moment — before the code exists.

But TDD is not about test count or coverage percentages. It's about confidence that the system works and continues to work. That means testing the things that matter: the happy paths users depend on, and the failure modes that would cause real damage if unhandled. A test suite with 100% coverage that only tests the happy path is worse than one with 60% coverage that also tests how the system behaves when the database is down, the input is malformed, or the third-party API returns garbage.

## The Steps

You MUST follow these steps in order. Do not write implementation code before writing a failing test. This sequence is the discipline — without it, you're just writing tests after the fact, which misses the design benefits entirely.

### 1. Establish Test Infrastructure

Before writing any test, ensure the project has a working test setup. If it does, follow its conventions. If it doesn't, surface the decision.

**If test infrastructure exists:**
- Identify the test framework in use (Jest, Vitest, Go testing, pytest, etc.)
- Identify the test file conventions (co-located, `__tests__/` directory, `_test.go` suffix, etc.)
- Identify patterns for mocking, fixtures, and test utilities
- Follow all of these exactly. Use `/rigor:code-structure` for file placement decisions.

**If test infrastructure does not exist:**
This is a decision that must be surfaced. Do NOT pick a test framework and start writing. Present:
- **The options**: At least two viable frameworks with trade-offs (speed, ecosystem support, existing project dependencies that favor one over another)
- **Structure recommendation**: Where test files should live, based on the project's existing code organization
- **Your recommendation**: Which framework fits the project best — but the human decides

Do NOT proceed until the test infrastructure decision is confirmed.

### 2. Identify What to Test

Before writing any test, think about what actually matters for this code. This is not about maximizing coverage — it's about testing the behavior that users and the system depend on.

**Happy paths** — The ways the code is expected to be used:
- The primary success case
- Important variations (different valid inputs, different user roles, different states)
- Edge cases within valid usage (empty lists, boundary values, first/last items)

**Failure modes** — The realistic ways things go wrong:
- Invalid input (malformed data, missing required fields, wrong types)
- Missing or unavailable dependencies (database down, API timeout, file not found)
- Business rule violations (insufficient funds, expired token, duplicate entry)
- Concurrent access issues if applicable (race conditions, stale reads)

Think about what would actually happen in production. A user sending an empty string, a network timeout, a database constraint violation — these are not hypothetical. They are the failures your tests need to prove are handled.

Do NOT test:
- Implementation details (private methods, internal state that isn't observable)
- Framework behavior (don't test that Express routes work — test that your handler does the right thing)
- Trivial getters/setters with no logic
- Things that can't realistically fail

### 3. Write the Failing Test First

For each behavior identified in step 2, follow this cycle:

1. **Write one test** that describes the expected behavior. The test should be readable as a specification — someone unfamiliar with the code should understand what the system does by reading the test name and assertions.

2. **Run the test — confirm it fails.** A test that passes before the implementation exists proves nothing. If it passes, either the test is wrong or the behavior already exists. Investigate before proceeding.

3. **Write the minimum implementation** to make the test pass. No more. Don't implement the next feature, don't refactor, don't optimize. Just make the test green.

4. **Run the test — confirm it passes.**

5. **Refactor if needed.** Now that the test is green, you can clean up the implementation. The test protects you — if the refactor breaks something, you'll know immediately.

6. **Repeat** for the next behavior.

This cycle applies to every piece of new behavior. It is not optional. It is not something you do "when there's time." It is how the code gets written.

### 4. Unit Tests — Verify Code Behavior

Unit tests verify that individual functions, methods, or modules behave correctly in isolation. They are fast, focused, and precise.

**What makes a good unit test:**
- Tests one behavior, not one function. A function that does three things needs at least three tests.
- Uses controlled inputs — mocks, stubs, or fixtures for external dependencies
- Runs in milliseconds. If a unit test is slow, it's not a unit test.
- Fails for exactly one reason. If a test can fail because of three different bugs, split it.

**What to mock and what not to:**
- Mock external services (databases, APIs, file systems, clocks) — these are slow, stateful, and unpredictable
- Do NOT mock the code under test or its core logic. If you're mocking so much that the test doesn't exercise real code, the test is worthless.
- Do NOT mock everything between the test and the database just to avoid integration tests — that's a false sense of security. Use integration tests for system behavior.

### 5. Integration Tests — Verify System Behavior

Integration tests verify that components work together correctly. They catch the bugs that unit tests miss — the ones that live in the seams between modules, in the database queries that look right but return wrong results, in the serialization boundaries between services.

After writing unit tests, you MUST explicitly evaluate whether the code needs integration tests. Look for these signals — if any are present, flag them and either write the integration test or document it as a required follow-up:

- **Raw database queries** (SQL strings, query builders) — a mocked unit test cannot verify that the query is syntactically correct, returns the right columns, or handles constraints. These need a real database.
- **Multi-step operations without transactions** — if the code does two writes that should be atomic (e.g., debiting one account and crediting another), a unit test with mocks will never reveal that a failure between the writes leaves the system in an inconsistent state. Flag this as both a test gap and a potential bug.
- **Serialization boundaries** — JSON parsing, database row mapping, API request/response transformation. The shapes can drift between what the code expects and what the system actually produces.
- **API endpoints** — request/response contracts, middleware chains, error formatting
- **Service-to-service communication** — HTTP clients, message queues, event buses

**What makes a good integration test:**
- Uses real dependencies where practical (real database, real HTTP calls to your own service)
- Tests the contract between components, not the internals of each
- Sets up and tears down its own state — no test should depend on another test's side effects
- Tests both success and failure at the integration boundary (what happens when the database rejects a constraint violation? when the API returns 500?)

**The relationship between unit and integration tests:**
Unit tests prove the logic is correct. Integration tests prove the system works. Both are required. A codebase with only unit tests will have bugs at integration boundaries. A codebase with only integration tests will have slow, fragile tests that are hard to debug.

### 6. Verify Test Quality

After writing tests, verify they actually protect against regressions:

- **Run the full test suite.** Everything must pass.
- **Check that failure tests actually exercise the error path.** A test that asserts `expect(fn).toThrow()` is useless if the function never actually throws in the test (e.g., because the mock swallows the error).
- **Review test names.** Every test name should read as a behavior specification: "returns 404 when user does not exist," not "test getUserById error case."

## Anti-Patterns

If you catch yourself doing any of these, STOP and reassess.

| What you're doing | What you should do instead |
|---|---|
| Writing implementation first, tests after | Write the failing test first. Always. |
| Writing a test that passes immediately | Either the behavior exists or the test is wrong. Investigate. |
| Testing only the happy path | Add failure mode tests. How does this code handle bad input, missing data, unavailable services? |
| Mocking everything to avoid integration tests | Write integration tests for system behavior. Mocks don't catch integration bugs. |
| Writing integration tests for pure logic | Use unit tests for isolated logic. Integration tests are for component interaction. |
| Testing implementation details | Test observable behavior. If the test breaks when you refactor internals, the test is coupled to implementation. |
| Skipping tests because "it's a simple change" | Simple changes break things. The test takes 30 seconds to write. Write it. |
| Writing one giant test that covers everything | Split into focused tests. Each test should fail for exactly one reason. |
| Picking a test framework without checking what the project already uses | Follow existing conventions. If none exist, surface the decision. |

## Composability

This skill is referenced by:
- `/rigor:debug` — for regression tests that prove the bug is fixed
- `/rigor:refactor` — for the full test lifecycle during structural changes
- `/rigor:code-structure` — for test file placement decisions

This skill references:
- `/rigor:code-structure` — for where test files should live
