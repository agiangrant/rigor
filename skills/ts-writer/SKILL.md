---
name: rigor:ts-writer
description: Use when writing or modifying TypeScript code — new files, new functions, new modules, or significant additions to existing code. Also use when the task requires choosing between TypeScript patterns (error handling, data modeling, async patterns, module structure) and the codebase doesn't have an established convention. Triggers for any TypeScript implementation work, not just when the user says "write."
---

# TypeScript Writer

## Philosophy

Writing code is making decisions. Every function signature, every type definition, every error handling pattern is a decision that future code will build on top of. The writer's job is not to produce code that works today — it's to produce code that works today AND doesn't constrain what needs to be built tomorrow.

You do not get to choose patterns based on what's popular, what's trending, or what your training data favors. You choose patterns based on what fits THIS codebase. If the codebase uses classes, you write classes. If it uses functional composition, you compose functions. If it has no established pattern for the thing you're building, you surface the decision — you don't silently pick one.

## Before Writing Any Code

You MUST complete these steps before producing implementation code. Writing code before understanding the context produces code that doesn't fit.

### 1. Scan the Codebase

Read the code around what you're building. Not just the file you're modifying — the neighboring files, the modules that will consume your code, the patterns already in use.

Look for:
- **Error handling pattern**: Does the project throw errors? Return Result types? Use custom error classes? Use union return types? Match it.
- **Async patterns**: Promises with async/await? Callbacks? Streams? Observables? Match it.
- **Data modeling**: Interfaces vs types vs classes? Branded types? Zod schemas? Match it.
- **Module structure**: How are exports organized? Barrel files? Named exports? Default exports? Match it.
- **Naming conventions**: camelCase methods? PascalCase types? Verb-first function names? Match it.
- **Dependency injection style**: Constructor injection? Function parameters? Module-level singletons? Match it.

The goal is to answer: **what patterns does this codebase already use, and which of those apply to what I'm about to write?**

Use `/rigor:code-structure` for file placement decisions.

### 2. Identify Pattern Decisions

If the codebase has an established pattern for what you're building, follow it. Go to step 4.

If you're building something the codebase hasn't done before — a new category of code, a new integration pattern, a new error handling approach — you MUST surface the pattern decision before writing. Do not pick a pattern because it's generally considered best practice. Pick one because it fits THIS project's trajectory.

Pattern decisions aren't only about implementation patterns (error handling, validation). They also include **data model ambiguities**. If the task uses a vague or generic concept — "resource," "item," "entity," "target" — and the codebase doesn't define what that means concretely, surface it. A generic `resourceId: string` that could reference anything is a data model decision masquerading as a field name. Should it be typed per resource type? Should it use a discriminated union? Does the codebase have a pattern for polymorphic references? These decisions shape queries, type safety, and how the feature composes with the rest of the system.

### 3. Surface Pattern Options

When you need to establish a new pattern, present options with trade-offs. The human needs to see the choices because the pattern you establish now becomes the pattern the codebase follows going forward.

Present:
- **What decision needs to be made**: Name the pattern category (error handling, data validation, async coordination, etc.)
- **The options**: At least two approaches, each with a concrete code example showing what the pattern looks like in practice
- **How each option composes with existing code**: Does it match the project's current style? Does it require existing code to adapt?
- **Forward-looking trade-offs**: Which option makes the NEXT feature easier? Which one scales better as the module grows? Which one is easier to test?
- **Your recommendation**: Which option you'd choose for this codebase and why — but the human decides

Common TypeScript pattern decisions that need surfacing:
- Error handling: thrown errors vs Result/Either types vs union returns
- Validation: runtime validation library (Zod, io-ts) vs manual validation vs type guards
- State management: immutable data + pure functions vs stateful classes
- API contracts: shared types vs generated types vs inferred types
- Async coordination: sequential awaits vs Promise.all vs streaming
- Configuration: environment-based vs config objects vs dependency injection

Do NOT write implementation code until pattern decisions are confirmed.

### 4. Write with the Tests Leading

Follow `/rigor:tdd`. The test comes first. This is not negotiable — it applies to every piece of new behavior the writer produces.

The test tells you what the code needs to do. The implementation makes the test pass. If you can't write a clear test for what you're about to implement, you don't understand the requirements well enough yet.

### 5. Implementation Standards

When writing the actual TypeScript:

**Types are documentation.** Every function parameter, every return value, every public interface should have explicit types. Don't rely on inference for public APIs — inference is for local variables and internal helpers where the type is obvious from context. Future readers of your function signature shouldn't need to read the implementation to know what it accepts and returns.

**Narrow over broad.** Use specific types, not general ones. `string` when it could be a union of specific values is a missed opportunity for the compiler to catch bugs. `Record<string, any>` is almost always wrong — define the shape. `unknown` over `any` when you genuinely don't know the type.

**Errors are part of the interface.** If a function can fail, the failure mode should be visible from the type signature or the documentation. Thrown errors are invisible to callers unless documented. Whatever pattern the project uses for errors, make failures explicit.

**Keep functions focused.** A function that does three things should be three functions. Long functions are hard to test, hard to name, and hard to reuse. If you're struggling to name a function, it probably does too much.

**Don't fight the language.** TypeScript has a powerful type system — use it. Discriminated unions for state machines. Generics for reusable abstractions. Utility types for transformations. Template literal types for string patterns. The type system catches bugs at compile time that tests catch at runtime — use both.

## Anti-Patterns

| What you're doing | What you should do instead |
|---|---|
| Using `any` to make the compiler stop complaining | Fix the type. Use `unknown` if you genuinely don't know, then narrow. |
| Picking a pattern because it's popular | Scan the codebase and match what exists, or surface the decision. |
| Writing a 50-line function | Split it. Each function does one thing. |
| Returning `null` for errors in some places and throwing in others | Pick one pattern and be consistent. If the project mixes approaches, flag it. |
| Using `as` type assertions to force types | Fix the actual type mismatch. Assertions hide bugs. |
| Ignoring the existing test patterns | Follow the project's test conventions. Use `/rigor:tdd`. |
| Creating a new utility function without checking if one exists | Search the codebase first. Duplication of logic is how inconsistencies are born. |
| Writing implementation before tests | Write the test first. Always. `/rigor:tdd` is not optional. |
| Silently choosing an error handling pattern | If the project hasn't established one for this kind of code, surface the decision. |

## Composability

This skill references:
- `/rigor:code-structure` — for where new files go
- `/rigor:tdd` — for test-driven implementation (mandatory)
- `/rigor:code-review` — for self-review on non-trivial implementations

This skill is referenced by:
- `/rigor:debug` — when the fix requires writing new code
- `/rigor:refactor` — when structural changes produce new modules
