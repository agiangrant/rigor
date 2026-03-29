# ai-skills Design

## Purpose

A portable library of reusable Claude Code skills and CLAUDE.md templates encoding Andrew's engineering philosophy. Skills are composable building blocks — invokable directly or by other skills. Templates are thin routing layers that wire skills together for specific project types.

## Directory Structure

```
ai-skills/
  CLAUDE.md
  skills/
    debug.md
    tdd.md
    code-review.md
    architecture-decisions.md
    ts:writer.md
    ts:unit-test.md
    ts:organizer.md
    go:writer.md
    py:writer.md
    rs:writer.md
  templates/
    base.md
    typescript.md
    go.md
    python.md
    rust.md
```

## Naming Convention

- **No namespace** = universal skill (applies to all projects)
- **`lang:skill-name`** = language-scoped (`ts:`, `go:`, `py:`, `rs:`)
- Future namespaces as needed (`api:`, `db:`, `infra:`, etc.)

## Skill Format

Standard skill markdown with frontmatter (`name`, `description`, trigger). Skills can invoke other skills via `/namespace:skill-name`. Each skill is self-contained — one file, one concern.

## Templates

- **`base.md`** — Core philosophy rules: TDD mandatory, no shortcuts, surface ambiguous decisions, lean on existing plugins for their domains
- **`typescript.md`**, **`go.md`**, etc. — Language-specific routing rules that reference `lang:*` skills
- Composable: copy `base.md` + relevant language template into a project's CLAUDE.md, tweak as needed
- Intentionally small — rules and routing, not knowledge

## Core Philosophy (encoded in skills)

- TDD is mandatory
- No shortcuts — correct over easy, always
- Make obvious decisions silently, surface ambiguous architecture/product/design decisions
- Skills encode experienced engineering judgment, not generic best practices
- YAGNI is guidance, not law — when you know the architecture, build for it

## What This Is Not

- Not a framework — no ceremony, no specs directory, no process enforcement
- Not a replacement for plugins like frontend-design — those handle their domains
- Not opinionated about process — opinionated about quality
