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
