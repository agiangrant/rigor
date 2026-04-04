---
name: rigor:go-writer
description: Use when writing or modifying Go code — new files, new functions, new packages, or significant additions to existing code. Also use when the task requires choosing between Go patterns (error handling, interface design, package structure, concurrency) and the codebase doesn't have an established convention. Triggers for any Go implementation work.
---

# Go Writer

## Philosophy

Go is opinionated. The language makes deliberate trade-offs toward simplicity, explicitness, and readability. Your job is to write code that fits Go's idioms AND this specific codebase's conventions. Go projects vary more than you'd expect in how they structure packages, handle errors, define interfaces, and manage dependencies — scan first, then write.

The same core principles apply as any writer skill: follow what exists, surface what doesn't. But Go has language-specific conventions that override general software engineering instincts. Lean types over deep hierarchies. Accept interfaces, return structs. A little duplication is better than a wrong abstraction.

## Before Writing Any Code

You MUST complete these steps before producing implementation code.

### 1. Scan the Codebase

Read the code around what you're building. Go projects reveal their conventions through package structure more than most languages.

Look for:
- **Package organization**: Flat vs nested? Domain-based (`user/`, `order/`) vs layer-based (`handler/`, `service/`, `repo/`)? `internal/` usage? `cmd/` for entry points?
- **Error handling pattern**: Sentinel errors (`var ErrNotFound = errors.New(...)`)? Custom error types with `errors.Is`/`errors.As`? Error wrapping with `fmt.Errorf("...: %w", err)`? Which pattern dominates?
- **Interface style**: Where are interfaces defined — with the consumer or the implementer? Are they small (1-3 methods) or large? Does the project use the accept-interfaces-return-structs pattern?
- **Dependency injection**: Constructor functions (`NewService(repo Repo) *Service`)? Global variables? Wire/fx? Functional options?
- **Naming**: Does the project follow standard Go naming? Short receiver names? Package-qualified names avoiding stutter (`user.User` vs `user.UserModel`)?
- **Testing patterns**: Table-driven tests? Testify? Standard library only? Test helpers? `_test.go` placement (same package vs `_test` package)?
- **Concurrency patterns**: Goroutines + channels? errgroup? Context propagation? Mutex usage?

The goal is to answer: **what does idiomatic Go look like in THIS codebase?**

Use `/rigor:code-structure` for package and file placement decisions.

### 2. Identify Pattern Decisions

If the codebase has an established pattern for what you're building, follow it. Go to step 4.

If you're building something the codebase hasn't done before, surface the pattern decision. Do not default to what blog posts recommend. Default to what fits this project.

Pattern decisions aren't only about implementation patterns. They also include **data model ambiguities** and **package boundary questions**. If the task introduces a new concept that could live in multiple packages, or uses a vague term that isn't concretely defined in the codebase, surface it.

### 3. Surface Pattern Options

When you need to establish a new pattern, present options. Go's simplicity means there are usually 2-3 viable approaches, not 10.

Present:
- **What decision needs to be made**: Name it concretely
- **The options**: With code examples showing what each looks like in practice
- **How each option composes with the existing codebase**: Does it match what's already there?
- **Forward-looking trade-offs**: Which option scales better as the package grows? Which is easier to test?
- **Your recommendation**: Based on this codebase, not general Go advice — but the human decides

Common Go pattern decisions that need surfacing:
- Error handling: sentinel errors vs custom types vs wrapped strings
- Interface boundaries: where to define, how wide
- Package boundaries: when to create a new package vs extend an existing one
- Configuration: struct-based vs functional options vs environment
- Concurrency: when goroutines are warranted vs sequential
- Database access: raw SQL vs sqlx vs ORM (sqlc, ent, gorm)

Do NOT write implementation code until pattern decisions are confirmed.

### 4. Write with the Tests Leading

Follow `/rigor:tdd`. The test comes first.

Test both the happy path and the failure modes — invalid input, error returns from dependencies, edge cases in business logic. Go's explicit error handling makes failure mode testing natural; use it.

Go's testing conventions are specific:
- Tests live in `_test.go` files in the same package (or `_test` package for black-box tests)
- Table-driven tests are the standard pattern for multiple cases
- Test function names describe the scenario: `TestCreateUser_InvalidEmail`
- Follow whatever test style the codebase already uses — if it uses testify, use testify. If it's standard library only, stay standard library.

### 5. Go-Specific Implementation Standards

**Accept interfaces, return structs.** Define interfaces at the consumer, not the implementer. A function that needs to read users should accept an interface with the methods it actually calls — not import the concrete repository type. Return concrete types so callers have full access to the struct's fields and methods.

**Errors are values, not exceptions.** Every function that can fail returns an error. Handle it or propagate it — never ignore it. Wrap errors with context using `fmt.Errorf("creating user: %w", err)` so the call chain is visible in logs. Match the project's wrapping style.

**Small interfaces.** The ideal Go interface has 1-3 methods. If your interface has 6 methods, you're probably defining it at the wrong level. Split it or move it to the consumer that only needs a subset.

**A little copying is better than a wrong dependency.** Go proverbs exist for a reason. If two packages need a small helper, copying it is often better than creating a shared `util` package that couples them. But this isn't a license to duplicate domain logic — business rules should have a single source of truth. Use judgment: copy mechanics, share logic.

**Package names matter.** Packages name their contents. `package user` exports `User`, not `UserModel`. `package http` exports `Handler`, not `HTTPHandler`. Avoid stutter. If the package name provides context, the exported name shouldn't repeat it.

**Zero values should be useful.** Structs should work with their zero values where possible. A `Config{}` with zero values should represent sensible defaults, not a broken state. This isn't always achievable, but when it is, it makes the API more forgiving.

**Context flows through.** If the codebase uses `context.Context`, propagate it through every function in the call chain. Don't drop it. Don't create new contexts from `context.Background()` in the middle of a call chain unless you have a specific reason (detaching from cancellation for cleanup work).

**Keep main thin.** `cmd/*/main.go` should wire dependencies and start the server. Business logic never lives in main.

## Anti-Patterns

| What you're doing | What you should do instead |
|---|---|
| Defining an interface next to the implementation | Define it at the consumer. The consumer knows what it needs. |
| Creating a `utils` or `helpers` package | Find the package that owns this logic. If it's truly generic, consider `internal/`. |
| Using `interface{}` or `any` to avoid designing types | Design the types. `any` is a last resort for genuinely polymorphic code. |
| Ignoring an error with `_` | Handle it or wrap it. If you truly don't care (rare), add a comment explaining why. |
| Creating deep package hierarchies | Go favors flat. A package per concept, not a package per file. |
| Reaching for goroutines when sequential code works | Concurrency adds complexity. Use it when you have a clear performance or architectural reason. |
| Using an ORM because "that's what you do" | Check what the project uses. If it's raw SQL or sqlx, match it. |
| Silently choosing a DI pattern | If the project doesn't have one, surface the decision. Constructor injection, functional options, and globals are different commitments. |
| Writing Go like TypeScript/Java (deep inheritance, generics everywhere) | Go is not those languages. Composition over inheritance. Generics when they eliminate real duplication, not as a default. |

## Composability

This skill references:
- `/rigor:code-structure` — for package and file placement
- `/rigor:tdd` — for test-driven implementation (mandatory)
- `/rigor:code-review` — for self-review on non-trivial implementations

This skill is referenced by:
- `/rigor:debug` — when the fix requires writing new Go code
- `/rigor:refactor` — when structural changes produce new packages
