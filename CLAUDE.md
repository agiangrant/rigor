# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

This is the source for **Rigor** — a collection of Claude Code skills and CLAUDE.md templates that get copied into other projects. All skills are published under the `rigor:` namespace. It is not a runnable application. There is no build system, no tests, no dependencies — just well-organized markdown.

## Repository Structure

- `skills/` — Each skill is a directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and markdown body
- `templates/` — CLAUDE.md templates: `base.md` (universal rules) + language templates (`typescript.md`, `go.md`, `python.md`, `rust.md`) containing routing rules
- `*-workspace/` — Eval workspaces for testing skills (contain `evals/` and `iteration-N/` dirs)
- `docs/specs/` — Design specs; `docs/plans/` — Implementation plans

## Skill File Convention

- Skills live in `skills/<skill-name>/SKILL.md`
- All skills use the `rigor:` namespace prefix
- Universal skills: `rigor:debug`, `rigor:tdd`, `rigor:code-review`, `rigor:architecture-decisions`, `rigor:init`, `rigor:code-structure`, `rigor:refactor`
- Language-specific skills: `rigor:ts-writer`, `rigor:go-writer`, `rigor:py-writer`, `rigor:rs-writer`
- Skills can invoke other skills via `/rigor:skill-name`
- Skills are composable — they can be used at the top level or nested inside other skills

## Template Convention

- `base.md` contains universal rules (TDD mandatory, no shortcuts, surface ambiguous decisions)
- Language templates contain routing rules that reference skills
- Templates are intentionally small — rules and routing, not knowledge
- To use: copy `base.md` + relevant language template into a project's CLAUDE.md

## Namespace Reference

| Skill | Description |
|-------|-------------|
| `rigor:debug` | Universal debugging |
| `rigor:tdd` | Test-driven development |
| `rigor:code-review` | Code review |
| `rigor:code-structure` | Code structure analysis |
| `rigor:refactor` | Code refactoring |
| `rigor:architecture-decisions` | Architecture decisions |
| `rigor:init` | Project setup / skill routing injection |
| `rigor:ts-writer` | TypeScript writer |
| `rigor:go-writer` | Go writer |
| `rigor:py-writer` | Python writer |
| `rigor:rs-writer` | Rust writer |

## Writing Skills

- Follow the standard skill format: YAML frontmatter with `name` and `description`, then markdown body
- `description` should start with "Use when..." and describe triggering conditions only — never summarize the workflow
- Keep skills concise — Claude is smart, only add what it doesn't already know
- One skill, one concern — if a skill does two things, split it
- Skills encode engineering judgment, not generic best practices
- Test skills in their corresponding `*-workspace/` before considering them done

## Core Philosophy

- **TDD is mandatory** — no exceptions, no shortcuts
- **Correct over easy** — never take the easy path over the correct one
- **Surface ambiguity** — make obvious decisions silently, but surface architecture/product/design decisions that could go either way
- **Experienced judgment** — YAGNI is guidance, not law. When you know the architecture, build for it.
- **Composability** — skills chain together. Each does one thing well.
