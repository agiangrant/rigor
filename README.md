# Rigor

Engineering discipline for AI coding agents. A portable library of skills and templates for [Claude Code](https://claude.ai/code) that enforce TDD, structured debugging, honest code review, and architecture decisions — so your AI assistant writes code like a senior engineer, not an intern with autocomplete.

## What This Is

Rigor is a collection of **skills** (structured workflows) and **CLAUDE.md templates** (routing rules) that you copy into your projects. Skills teach Claude Code *how* to approach engineering tasks — not what code to write, but how to think about writing it.

No build system. No dependencies. No runtime. Just markdown that makes your AI agent better.

## Quick Start

### 1. Install the skills

Copy the `skills/` directory into your project's `.claude/skills/` directory (or wherever your Claude Code skills live).

### 2. Bootstrap your CLAUDE.md

Run `/rigor:init` in Claude Code. It will:
- Detect the languages in your project
- Inject skill routing into your CLAUDE.md (or create one)
- Wire up the correct writer skills for your stack

Or manually: copy `templates/base.md` into your project's `CLAUDE.md`, then append the language template(s) you need (`templates/typescript.md`, `templates/go.md`, etc.).

### 3. Work normally

The skills activate automatically based on what you're doing. Debugging? `rigor:debug` kicks in. Writing new TypeScript? `rigor:ts-writer` takes over. No slash commands needed once routing is configured — though you can always invoke skills directly with `/rigor:skill-name`.

## Skills

### Universal (language-agnostic)

| Skill | What It Does |
|---|---|
| `rigor:tdd` | Test-driven development. Failing test first, minimum implementation, refactor. Covers unit and integration test strategy. |
| `rigor:debug` | Structured debugging. Step back, understand the system, find the root cause — not the symptom. Prevents bandaid fixes. |
| `rigor:code-review` | Strict, objective review. Correctness, design, test coverage, code quality. No rubber stamps. |
| `rigor:architecture-decisions` | Research-driven decision making for choices that are expensive to reverse. Surface options, trade-offs, and unknowns. |
| `rigor:code-structure` | File and directory placement. Scan existing structure, follow it or surface the decision. Prevents structural drift. |
| `rigor:refactor` | High-impact restructuring. Full scope analysis, no half-migrations, no dead code left behind. |
| `rigor:init` | Project bootstrapping. Detects languages, injects skill routing into CLAUDE.md. |

### Language Writers

| Skill | Language |
|---|---|
| `rigor:ts-writer` | TypeScript |
| `rigor:go-writer` | Go |
| `rigor:py-writer` | Python |
| `rigor:rs-writer` | Rust |

Writer skills follow existing codebase conventions. If a convention isn't established, they surface the decision rather than silently picking one.

## How Skills Compose

Skills are designed to chain together. Each does one thing well, and they call each other when needed:

```
rigor:debug ──→ rigor:tdd (regression tests)
            ──→ rigor:architecture-decisions (structural issues)

rigor:refactor ──→ rigor:code-structure (file placement)
               ──→ rigor:tdd (test lifecycle)
               ──→ rigor:architecture-decisions (boundary changes)

Writer skills ──→ rigor:code-structure (where files go)
              ──→ rigor:tdd (test-first implementation)

rigor:code-review ──→ rigor:tdd (test adequacy evaluation)
```

## Philosophy

**TDD is mandatory.** Write the failing test first. No exceptions. No "I'll add tests later."

**Correct over easy.** The right fix that takes longer always beats the quick patch. Bandaids get revisited every two weeks for the next ten years.

**Surface ambiguity.** Make obvious decisions silently. But when reasonable alternatives exist — especially for architecture, data modeling, or system boundaries — present options with trade-offs and let the human decide.

**Follow what exists.** Scan the codebase before writing. Match its conventions, patterns, and structure. If the project uses classes, write classes. If it uses functional composition, compose functions.

**No rubber stamps.** Code review means finding problems, not writing "LGTM." Every finding is objective, actionable, and tied to a concrete concern.

## Writing Your Own Skills

Skills are markdown files with YAML frontmatter:

```markdown
---
name: rigor:my-skill
description: Use when [triggering conditions]. Also use when [related triggers].
---

# My Skill

## Philosophy
[Why this skill exists and what engineering judgment it encodes]

## The Steps
[Ordered steps the agent must follow]

## Anti-Patterns
[Common mistakes to watch for]

## Composability
[Which skills this one calls and which call it]
```

Key principles:
- `description` defines *when* the skill fires — start with "Use when..." and describe triggering conditions only
- One skill, one concern. If it does two things, split it.
- Encode engineering judgment, not generic best practices. Claude already knows best practices.
- Keep it concise. Claude is smart — only add what it doesn't already know.

## License

MIT
