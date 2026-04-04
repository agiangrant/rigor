# [Project Name]

## Core Rules

- **TDD is MANDATORY.** Write the failing test first. No exceptions. No shortcuts.
- **NEVER take the easy path over the correct one**, no matter the difficulty.
- **Make obvious decisions silently.** Surface ambiguous architecture, product, and design decisions for discussion.
- **YAGNI is guidance, not law.** When the architecture is known, build for it.

## Skill Routing

Use skills for ALL non-trivial work. If there is any chance a skill applies, invoke it — it is always better to invoke a skill unnecessarily than to skip one.

| Trigger | Skill |
|---|---|
| Writing or modifying code in any language | The language's writer skill (see language section below) |
| New feature, new module, new behavior | `/rigor:tdd` — before writing implementation |
| Bug, test failure, unexpected behavior | `/rigor:debug` — before proposing any fix |
| Creating new files or directories | `/rigor:code-structure` — before creating files |
| Refactoring, restructuring, extracting | `/rigor:refactor` — before moving code |
| Design choices affecting system structure | `/rigor:architecture-decisions` — before committing to an approach |
| Reviewing code, completing a feature | `/rigor:code-review` — after implementation |

Follow every instruction in the invoked skill. These are mandatory workflows, not suggestions.

## Existing Plugins

Use available plugins for their domains (e.g., frontend-design for UI work). Skills complement plugins — they don't replace them.
