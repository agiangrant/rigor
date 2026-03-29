# ai-skills Scaffold Implementation Plan

> **For agentic workers:** Use this plan to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the directory structure, CLAUDE.md, initial skill stubs, and template files for a portable skills library.

**Architecture:** Flat `skills/` directory with colon-namespaced files for language-specific skills and unnamespaced files for universal skills. `templates/` holds composable CLAUDE.md fragments. The repo's own CLAUDE.md guides skill development within this project.

**Tech Stack:** Markdown, standard skill frontmatter (YAML)

---

### Task 1: Initialize git repo

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/andrew/projects/ai-skills
git init
```

- [ ] **Step 2: Create .gitignore**

```
.DS_Store
*.swp
*.swo
*~
.claude/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: initialize repo"
```

---

### Task 2: Create project CLAUDE.md

This CLAUDE.md governs how Claude works **within this repo** — it's about writing and improving skills, not a template for other projects.

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

```markdown
# ai-skills

A portable library of reusable Claude Code skills and CLAUDE.md templates.

## What This Repo Is

This is a collection of skills and templates that get copied into other projects. It is not a runnable application. There is no build system, no dependencies — just well-organized markdown.

## Skill File Convention

- Skills live in `skills/`
- Universal skills have no namespace: `debug.md`, `tdd.md`
- Language-specific skills use short namespace prefixes with colons: `ts:writer.md`, `go:writer.md`, `py:writer.md`, `rs:writer.md`
- Each skill is a single markdown file with YAML frontmatter (`name`, `description`)
- Skills can invoke other skills via `/namespace:skill-name` or `/skill-name` for universal skills
- Skills are composable — they can be used at the top level or nested inside other skills

## Template Convention

- Templates live in `templates/`
- `base.md` contains universal rules (TDD mandatory, no shortcuts, surface ambiguous decisions)
- Language templates (`typescript.md`, `go.md`, etc.) contain routing rules that reference skills
- Templates are intentionally small — rules and routing, not knowledge
- To use: copy `base.md` + relevant language template into a project's CLAUDE.md, tweak as needed

## Namespace Reference

| Prefix | Language |
|--------|----------|
| `ts:` | TypeScript |
| `go:` | Go |
| `py:` | Python |
| `rs:` | Rust |
| _(none)_ | Universal / language-agnostic |

## Writing Skills

- Follow the standard skill format: YAML frontmatter with `name` and `description`, then markdown body
- `description` should start with "Use when..." and describe triggering conditions only — never summarize the workflow
- Keep skills concise — Claude is smart, only add what it doesn't already know
- One skill, one concern — if a skill does two things, split it
- Skills encode engineering judgment, not generic best practices
- Test skills before considering them done

## Core Philosophy

These skills exist to enforce:

- **TDD is mandatory** — no exceptions, no shortcuts
- **Correct over easy** — never take the easy path over the correct one
- **Surface ambiguity** — make obvious decisions silently, but surface architecture/product/design decisions that could go either way
- **Experienced judgment** — YAGNI is guidance, not law. When you know the architecture, build for it.
- **Composability** — skills chain together. Each does one thing well.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add project CLAUDE.md for skill development guidance"
```

---

### Task 3: Create universal skill stubs

**Files:**
- Create: `skills/debug.md`
- Create: `skills/tdd.md`
- Create: `skills/code-review.md`
- Create: `skills/architecture-decisions.md`

- [ ] **Step 1: Create `skills/debug.md`**

```markdown
---
name: debug
description: Use when encountering any bug, test failure, or unexpected behavior — before proposing fixes
---

# Debug

TODO: This is a stub. Define the debugging methodology skill.
```

- [ ] **Step 2: Create `skills/tdd.md`**

```markdown
---
name: tdd
description: Use when implementing any feature or bugfix, before writing implementation code
---

# TDD

TODO: This is a stub. Define the TDD enforcement skill.
```

- [ ] **Step 3: Create `skills/code-review.md`**

```markdown
---
name: code-review
description: Use when reviewing code changes, before approving or merging
---

# Code Review

TODO: This is a stub. Define the code review methodology skill.
```

- [ ] **Step 4: Create `skills/architecture-decisions.md`**

```markdown
---
name: architecture-decisions
description: Use when facing design choices that affect system structure, data flow, or component boundaries
---

# Architecture Decisions

TODO: This is a stub. Define the architecture decision-making skill.
```

- [ ] **Step 5: Commit**

```bash
git add skills/debug.md skills/tdd.md skills/code-review.md skills/architecture-decisions.md
git commit -m "feat: add universal skill stubs"
```

---

### Task 4: Create TypeScript skill stubs

**Files:**
- Create: `skills/ts:writer.md`
- Create: `skills/ts:unit-test.md`
- Create: `skills/ts:organizer.md`

- [ ] **Step 1: Create `skills/ts:writer.md`**

```markdown
---
name: ts:writer
description: Use when writing or modifying TypeScript code — guides structure, patterns, and idioms
---

# TypeScript Writer

TODO: This is a stub. Define the TypeScript code writing skill.
```

- [ ] **Step 2: Create `skills/ts:unit-test.md`**

```markdown
---
name: ts:unit-test
description: Use when writing TypeScript unit tests — guides test structure, assertions, and coverage
---

# TypeScript Unit Test

TODO: This is a stub. Define the TypeScript unit testing skill.
```

- [ ] **Step 3: Create `skills/ts:organizer.md`**

```markdown
---
name: ts:organizer
description: Use when organizing TypeScript project structure — guides file layout, module boundaries, and exports
---

# TypeScript Organizer

TODO: This is a stub. Define the TypeScript code organization skill.
```

- [ ] **Step 4: Commit**

```bash
git add "skills/ts:writer.md" "skills/ts:unit-test.md" "skills/ts:organizer.md"
git commit -m "feat: add TypeScript skill stubs"
```

---

### Task 5: Create Go, Python, Rust skill stubs

**Files:**
- Create: `skills/go:writer.md`
- Create: `skills/py:writer.md`
- Create: `skills/rs:writer.md`

- [ ] **Step 1: Create `skills/go:writer.md`**

```markdown
---
name: go:writer
description: Use when writing or modifying Go code — guides structure, patterns, and idioms
---

# Go Writer

TODO: This is a stub. Define the Go code writing skill.
```

- [ ] **Step 2: Create `skills/py:writer.md`**

```markdown
---
name: py:writer
description: Use when writing or modifying Python code — guides structure, patterns, and idioms
---

# Python Writer

TODO: This is a stub. Define the Python code writing skill.
```

- [ ] **Step 3: Create `skills/rs:writer.md`**

```markdown
---
name: rs:writer
description: Use when writing or modifying Rust code — guides structure, patterns, and idioms
---

# Rust Writer

TODO: This is a stub. Define the Rust code writing skill.
```

- [ ] **Step 4: Commit**

```bash
git add "skills/go:writer.md" "skills/py:writer.md" "skills/rs:writer.md"
git commit -m "feat: add Go, Python, Rust skill stubs"
```

---

### Task 6: Create templates

**Files:**
- Create: `templates/base.md`
- Create: `templates/typescript.md`
- Create: `templates/go.md`
- Create: `templates/python.md`
- Create: `templates/rust.md`

- [ ] **Step 1: Create `templates/base.md`**

```markdown
# [Project Name]

## Core Rules

- **TDD is MANDATORY.** Write the failing test first. No exceptions. No shortcuts.
- **NEVER take the easy path over the correct one**, no matter the difficulty.
- **Make obvious decisions silently.** Surface ambiguous architecture, product, and design decisions for discussion.
- **YAGNI is guidance, not law.** When the architecture is known, build for it.

## Skill Routing

When debugging, use `/debug` and follow all instructions.
When reviewing code, use `/code-review` and follow all instructions.
When making architecture decisions, use `/architecture-decisions` and follow all instructions.

## Existing Plugins

Use available plugins for their domains (e.g., frontend-design for UI work). Skills complement plugins — they don't replace them.
```

- [ ] **Step 2: Create `templates/typescript.md`**

```markdown
## TypeScript

When writing or modifying TypeScript code, use `/ts:writer` and follow all instructions.
When writing unit tests, use `/ts:unit-test` and follow all instructions.
When organizing code or restructuring, use `/ts:organizer` and follow all instructions.

All TypeScript skills enforce `/tdd` — tests come first, always.
```

- [ ] **Step 3: Create `templates/go.md`**

```markdown
## Go

When writing or modifying Go code, use `/go:writer` and follow all instructions.

All Go skills enforce `/tdd` — tests come first, always.
```

- [ ] **Step 4: Create `templates/python.md`**

```markdown
## Python

When writing or modifying Python code, use `/py:writer` and follow all instructions.

All Python skills enforce `/tdd` — tests come first, always.
```

- [ ] **Step 5: Create `templates/rust.md`**

```markdown
## Rust

When writing or modifying Rust code, use `/rs:writer` and follow all instructions.

All Rust skills enforce `/tdd` — tests come first, always.
```

- [ ] **Step 6: Commit**

```bash
git add templates/
git commit -m "feat: add CLAUDE.md templates (base + language routing)"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify directory structure**

```bash
find /Users/andrew/projects/ai-skills -type f | sort
```

Expected output:
```
/Users/andrew/projects/ai-skills/.gitignore
/Users/andrew/projects/ai-skills/CLAUDE.md
/Users/andrew/projects/ai-skills/docs/plans/2026-03-29-ai-skills-scaffold.md
/Users/andrew/projects/ai-skills/docs/specs/2026-03-29-ai-skills-design.md
/Users/andrew/projects/ai-skills/skills/architecture-decisions.md
/Users/andrew/projects/ai-skills/skills/code-review.md
/Users/andrew/projects/ai-skills/skills/debug.md
/Users/andrew/projects/ai-skills/skills/go:writer.md
/Users/andrew/projects/ai-skills/skills/py:writer.md
/Users/andrew/projects/ai-skills/skills/rs:writer.md
/Users/andrew/projects/ai-skills/skills/tdd.md
/Users/andrew/projects/ai-skills/skills/ts:organizer.md
/Users/andrew/projects/ai-skills/skills/ts:unit-test.md
/Users/andrew/projects/ai-skills/skills/ts:writer.md
/Users/andrew/projects/ai-skills/templates/base.md
/Users/andrew/projects/ai-skills/templates/go.md
/Users/andrew/projects/ai-skills/templates/python.md
/Users/andrew/projects/ai-skills/templates/rust.md
/Users/andrew/projects/ai-skills/templates/typescript.md
```

- [ ] **Step 2: Commit docs and any remaining files**

```bash
git add docs/
git commit -m "docs: add design spec and implementation plan"
```
