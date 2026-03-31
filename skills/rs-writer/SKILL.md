---
name: rigor:rs-writer
description: Use when writing or modifying Rust code — new files, new functions, new modules, or significant additions to existing code. Also use when the task requires choosing between Rust patterns (error handling, trait design, module structure, async runtime, ownership patterns) and the codebase doesn't have an established convention. Triggers for any Rust implementation work.
---

# Rust Writer

## Philosophy

Rust's compiler is the strictest reviewer you'll ever have. It enforces memory safety, ownership, and lifetimes at compile time — which means the patterns you choose matter more than in most languages, because the compiler will force you to live with them. A wrong abstraction in Python is annoying. A wrong abstraction in Rust fights you on every borrow.

Your job is to write code that works WITH the borrow checker, not around it. If you're reaching for `clone()` to silence the compiler, `Arc<Mutex<>>` where a simpler ownership model would work, or `unsafe` for convenience — stop and reconsider the design. The compiler is telling you something about your ownership model.

The same core principles apply as any writer skill: follow what exists, surface what doesn't. But Rust's type system and ownership model mean pattern decisions have higher stakes. An error type choice, a trait boundary, or an async runtime selection echoes through the entire codebase.

## Before Writing Any Code

You MUST complete these steps before producing implementation code.

### 1. Scan the Codebase

Read the code around what you're building. Rust projects encode enormous amounts of convention in their `Cargo.toml`, error types, and trait boundaries.

Look for:
- **Error handling**: `anyhow` for applications? `thiserror` for libraries? Custom error enums? `Result<T, Box<dyn Error>>`? The error strategy is one of the most pervasive patterns in any Rust codebase.
- **Async runtime**: tokio? async-std? smol? No async at all? The runtime choice constrains every async function in the project.
- **Trait design**: Are traits small and focused? Does the project use dynamic dispatch (`Box<dyn Trait>`) or static dispatch (generics)? Where are trait definitions relative to implementations?
- **Module structure**: `mod.rs` style or file-per-module? How deep is the module tree? What's public and what's `pub(crate)`?
- **Serialization**: serde everywhere? Manual serialization? What derive macros are standard?
- **Crate structure**: Single crate? Workspace with multiple crates? Where do the boundaries fall?
- **Testing**: `#[cfg(test)]` inline modules? Separate `tests/` directory for integration tests? Test helpers and fixtures?
- **Ownership patterns**: Does the project favor owned types or references in function signatures? How are shared resources managed (Arc, Rc, owned clones)?
- **Builder patterns**: Does the project use builders for complex structs? Typestate patterns? `Default` implementations?

The goal is to answer: **what does idiomatic Rust look like in THIS codebase?**

Use `/rigor:code-structure` for module and file placement decisions.

### 2. Identify Pattern Decisions

If the codebase has an established pattern for what you're building, follow it. Go to step 4.

If you're building something the codebase hasn't done before, surface the pattern decision. Rust pattern decisions are particularly expensive to change later because the type system weaves them through every call site.

Pattern decisions include **ownership model questions**. If the task introduces shared state, concurrent access, or resource lifetimes that the codebase hasn't dealt with before, surface it.

### 3. Surface Pattern Options

When you need to establish a new pattern, present options.

Present:
- **What decision needs to be made**: Name the pattern category
- **The options**: With concrete code examples showing types, traits, and function signatures
- **How each option composes with existing code**: Does it match the project's error types, trait boundaries, and ownership patterns?
- **Forward-looking trade-offs**: Which option is easier to evolve? Which creates the least friction with the borrow checker as the module grows?
- **Your recommendation**: Based on this codebase — but the human decides

Common Rust pattern decisions that need surfacing:
- Error handling: thiserror custom enums vs anyhow vs custom error types
- Async runtime: tokio vs async-std (or staying sync)
- Trait boundaries: generics vs dynamic dispatch for extensibility
- Ownership: owned types vs references vs `Cow<>` in APIs
- Concurrency: channels vs shared state (Arc<Mutex<>>) vs actor model
- Serialization: serde derives vs manual impl vs no serialization
- Builder patterns: typestate vs optional fields vs `Default` + setters

Do NOT write implementation code until pattern decisions are confirmed.

### 4. Write with the Tests Leading

Follow `/rigor:tdd`. The test comes first.

Rust testing conventions:
- Unit tests in `#[cfg(test)] mod tests` at the bottom of the source file
- Integration tests in `tests/` directory at the crate root
- Test function names describe the scenario: `test_create_user_with_duplicate_email_returns_error`
- Follow whatever test style the codebase already uses — assertion macros, test helpers, mock patterns

### 5. Rust-Specific Implementation Standards

**Make invalid states unrepresentable.** Use the type system to prevent bugs. Enums for state machines, not strings. Newtypes for domain values that shouldn't be confused (`UserId(String)` vs bare `String`). `NonZeroU32` when zero is invalid. The compiler catches what tests miss.

**Errors are types.** Define error enums that capture what can go wrong. Each variant carries the context needed to handle or report the error. Use `thiserror` if the project uses it. Implement `Display` and `Error`. Map errors at boundaries with `map_err` or `?` with `From` implementations. Never use `.unwrap()` in library or production code — it's a crash waiting for the right input.

**Own at boundaries, borrow internally.** Public API functions should generally accept owned types or `&str`/`&[T]` — whichever the codebase prefers. Internal functions can use references freely. If you're cloning everywhere to satisfy the borrow checker, the ownership model is wrong — reconsider who owns what.

**Keep lifetimes simple.** If a struct needs lifetime parameters, make sure that complexity is justified. Often, owning the data (String instead of &str) is simpler and the performance difference doesn't matter. Only reach for lifetimes when profiling shows the allocation matters or when the API genuinely needs to borrow.

**Use the type system, not runtime checks.** Prefer `Option<T>` over nullable values with runtime checks. Prefer `enum` over string matching. Prefer `Result<T, E>` over sentinel values. The compiler enforces these at every call site — runtime checks only enforce them where you remembered to add them.

**Derive what the project derives.** If every struct has `#[derive(Debug, Clone)]`, follow that. If the project derives `Serialize, Deserialize` on all data types, do the same. Don't add derives speculatively, but match the project's baseline.

**`unsafe` is a last resort.** If you're reaching for `unsafe`, document exactly why it's needed and what invariants must be maintained. In most application code, `unsafe` is never necessary. If you think you need it, you probably need a different design.

## Anti-Patterns

| What you're doing | What you should do instead |
|---|---|
| Using `.unwrap()` in non-test code | Use `?` or handle the error explicitly. |
| Cloning to satisfy the borrow checker | Reconsider the ownership model. Who should own this data? |
| Using `String` everywhere when `&str` would work | Accept references where you don't need ownership. Follow the project's convention. |
| Using `Box<dyn Error>` when the project has typed errors | Define error variants. Typed errors are self-documenting and matchable. |
| Adding lifetime parameters to everything | Own the data unless profiling says otherwise. Simpler is better. |
| Using `Arc<Mutex<>>` as a first instinct for shared state | Consider channels, owned clones, or restructuring to avoid shared mutable state. |
| Silently choosing an error type strategy | If the project doesn't have one, surface the decision. It affects every function signature. |
| Writing `unsafe` without justification | Redesign to avoid it. Document if genuinely necessary. |
| Using `as` casts for numeric conversions | Use `try_from`/`try_into` — `as` silently truncates. |
| Adding `pub` to everything | Default to private. Use `pub(crate)` for crate-internal sharing. Only `pub` what's part of the external API. |

## Composability

This skill references:
- `/rigor:code-structure` — for module and file placement
- `/rigor:tdd` — for test-driven implementation (mandatory)
- `/rigor:code-review` — for self-review on non-trivial implementations

This skill is referenced by:
- `/rigor:debug` — when the fix requires writing new Rust code
- `/rigor:refactor` — when structural changes produce new modules
