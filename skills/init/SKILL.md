---
name: rigor:init
description: Use when setting up a project to use the ai-skills library, when the user says "init", "setup skills", "bootstrap", or when you detect a project has no skill routing in its CLAUDE.md. Also use when new languages are added to a project and the skill routing needs updating.
---

# Init

## What This Does

Injects skill routing into a project's CLAUDE.md so that the skills are actually triggered during development. Without this routing, the skills exist but never fire — the model has no cue to use them.

This skill is idempotent. Running it again on a project that's already configured will detect the existing section and only add missing language writers if new languages are found.

## The Steps

### 1. Detect Project Languages

Scan the project root for language indicators:

| Indicator | Language | Writer Skill |
|---|---|---|
| `package.json`, `tsconfig.json`, `*.ts`, `*.tsx` | TypeScript | `/ts:writer` |
| `go.mod`, `*.go` | Go | `/go:writer` |
| `pyproject.toml`, `requirements.txt`, `setup.py`, `*.py` | Python | `/py:writer` |
| `Cargo.toml`, `*.rs` | Rust | `/rs:writer` |

Check for multiple languages — many projects are polyglot. Collect all detected languages.

### 2. Check for Existing CLAUDE.md

Read the project's CLAUDE.md (or CLAUDE.md at the project root).

**If no CLAUDE.md exists:** Create one with the skill routing section as the first content, followed by a basic project section placeholder.

**If CLAUDE.md exists:** Check if the skill routing section is already present by looking for the marker `<!-- AI-SKILLS-ROUTING -->`.

- **If marker exists:** Read the existing section. Check which language writers are listed. Compare against detected languages from step 1. Add any missing writers. Report what was added.
- **If marker does not exist:** Inject the skill routing section at the TOP of the file (before existing content). The existing CLAUDE.md content stays intact below the injected section.

### 3. Generate the Skill Routing Section

The section MUST contain all of the following. Use this exact structure:

```markdown
<!-- AI-SKILLS-ROUTING -->
## ⚠️ IMPORTANT: Skill-Based Development — DO NOT REMOVE

**You MUST follow these skill routing rules for ALL development work in this project. These are not suggestions. They are mandatory workflows that ensure code quality, architectural consistency, and long-term maintainability.**

### When to Use Skills

**Before writing any implementation code**, check if a skill applies. If there is even a small chance a skill is relevant, invoke it. It is always better to invoke a skill and find it unnecessary than to skip it and produce inconsistent code.

### Universal Skills (always active)

| Trigger | Skill | When |
|---|---|---|
| Bug, test failure, unexpected behavior | `/rigor:debug` | Before proposing any fix. Follow the full diagnostic workflow. |
| New feature, new module, new functionality | `/rigor:tdd` | Before writing implementation. Tests come first — always. |
| Creating new files or directories | `/rigor:code-structure` | Before creating files. Scan existing structure, follow or surface options. |
| Refactoring, restructuring, extracting | `/rigor:refactor` | Before moving code. Understand scope, surface options, execute completely. |
| Design choices affecting system structure | `/rigor:architecture-decisions` | Before committing to an approach. Research, surface questions, present options. |
| Reviewing code, completing a feature | `/rigor:code-review` | After implementation. Strict, objective review — no rubber stamps. |

### Language Writers (use for ALL code in the respective language)

{LANGUAGE_WRITERS_TABLE}

### How Skills Compose

- `/rigor:debug` → uses `/rigor:tdd` for regression tests, escalates to `/rigor:architecture-decisions` for structural issues
- `/rigor:refactor` → uses `/rigor:code-structure` for placement, `/rigor:tdd` for test lifecycle, `/rigor:architecture-decisions` for boundary changes
- Writer skills → use `/rigor:code-structure` for file placement, `/rigor:tdd` for test-driven implementation
- `/rigor:code-review` → evaluates against `/rigor:tdd` standards for test adequacy

### The Core Rules

1. **Follow existing patterns.** Scan the codebase before writing. Match what exists.
2. **Surface what you don't know.** If a pattern isn't established, present options with trade-offs. Let the human decide.
3. **TDD is mandatory.** Tests before implementation. Happy paths AND failure modes.
4. **No bandaids.** Fix the root cause. If it requires more work, surface the scope and do it right.
5. **No dead code.** Clean up after yourself. Old code is in git, not in the codebase.
6. **Code quality is non-negotiable.** No slop. Strict reviews. Constructive feedback.
<!-- END-AI-SKILLS-ROUTING -->
```

The `{LANGUAGE_WRITERS_TABLE}` placeholder gets replaced with a table based on detected languages. Format:

```markdown
| Trigger | Skill | When |
|---|---|---|
| Writing or modifying TypeScript | `/ts:writer` | For ALL TypeScript implementation work. Follow existing patterns or surface new ones. |
| Writing or modifying Go | `/go:writer` | For ALL Go implementation work. Follow existing patterns or surface new ones. |
```

Only include rows for languages actually detected in the project. If no languages are detected, include all four with a note that the project should be scanned once source files exist.

### 4. Write the File

If creating a new CLAUDE.md:
```markdown
{SKILL_ROUTING_SECTION}

# {Project Name}

<!-- Add project-specific instructions below -->
```

If injecting into an existing CLAUDE.md:
- Place the skill routing section at the TOP of the file
- Add a single blank line between the injected section and the existing content
- Do NOT modify any existing content

### 5. Report What Was Done

Tell the human:
- Whether CLAUDE.md was created or updated
- Which languages were detected
- Which writer skills were added
- If this was a re-run, which writers were already present and which were added

## Detecting Changes on Re-Run

When the marker `<!-- AI-SKILLS-ROUTING -->` already exists:

1. Find the section between `<!-- AI-SKILLS-ROUTING -->` and `<!-- END-AI-SKILLS-ROUTING -->`
2. Parse the Language Writers table to find which writers are already listed
3. Compare against currently detected languages
4. If all detected languages are already listed — report "skills are up to date, no changes needed"
5. If new languages are detected — regenerate ONLY the Language Writers table, replacing it in place. Do not touch the rest of the section.
