<!-- AI-SKILLS-ROUTING -->
## ⚠️ IMPORTANT: Skill-Based Development — DO NOT REMOVE

**You MUST follow these skill routing rules for ALL development work in this project. These are not suggestions. They are mandatory workflows that ensure code quality, architectural consistency, and long-term maintainability.**

### When to Use Skills

**Before writing any implementation code**, check if a skill applies. If there is even a small chance a skill is relevant, invoke it. It is always better to invoke a skill and find it unnecessary than to skip it and produce inconsistent code.

### Universal Skills (always active)

| Trigger | Skill | When |
|---|---|---|
| Bug, test failure, unexpected behavior | `/debug` | Before proposing any fix. Follow the full diagnostic workflow. |
| New feature, new module, new functionality | `/tdd` | Before writing implementation. Tests come first — always. |
| Creating new files or directories | `/code-structure` | Before creating files. Scan existing structure, follow or surface options. |
| Refactoring, restructuring, extracting | `/refactor` | Before moving code. Understand scope, surface options, execute completely. |
| Design choices affecting system structure | `/architecture-decisions` | Before committing to an approach. Research, surface questions, present options. |
| Reviewing code, completing a feature | `/code-review` | After implementation. Strict, objective review — no rubber stamps. |

### Language Writers (use for ALL code in the respective language)

| Trigger | Skill | When |
|---|---|---|
| Writing or modifying TypeScript | `/ts:writer` | For ALL TypeScript implementation work. Follow existing patterns or surface new ones. |

### How Skills Compose

- `/debug` → uses `/tdd` for regression tests, escalates to `/architecture-decisions` for structural issues
- `/refactor` → uses `/code-structure` for placement, `/tdd` for test lifecycle, `/architecture-decisions` for boundary changes
- Writer skills → use `/code-structure` for file placement, `/tdd` for test-driven implementation
- `/code-review` → evaluates against `/tdd` standards for test adequacy

### The Core Rules

1. **Follow existing patterns.** Scan the codebase before writing. Match what exists.
2. **Surface what you don't know.** If a pattern isn't established, present options with trade-offs. Let the human decide.
3. **TDD is mandatory.** Tests before implementation. Happy paths AND failure modes.
4. **No bandaids.** Fix the root cause. If it requires more work, surface the scope and do it right.
5. **No dead code.** Clean up after yourself. Old code is in git, not in the codebase.
6. **Code quality is non-negotiable.** No slop. Strict reviews. Constructive feedback.
<!-- END-AI-SKILLS-ROUTING -->

# Booking API

A room booking API built with Express and TypeScript.

## Development

- Run tests with `npx vitest`
- TypeScript strict mode enabled

## Architecture

Services handle business logic, routes handle HTTP, models define types.
