# Data Pipeline

## Overview

This is a data ingestion pipeline that processes CSV files and loads them into PostgreSQL.

## Development

- Use poetry for dependency management
- Run tests with `pytest`
- Format with `black` and `ruff`

## Architecture

The pipeline has three stages:
1. Ingest — reads from S3
2. Transform — applies business rules
3. Load — writes to PostgreSQL

## Core Rules

- **TDD is MANDATORY.** Write the failing test first. No exceptions. No shortcuts.
- **NEVER take the easy path over the correct one**, no matter the difficulty.
- **Make obvious decisions silently.** Surface ambiguous architecture, product, and design decisions for discussion.
- **YAGNI is guidance, not law.** When the architecture is known, build for it.

## Skill Routing

When writing or modifying Python code, use `/py:writer` and follow all instructions.
When debugging, use `/debug` and follow all instructions.
When writing tests, use `/tdd` and follow all instructions.
When reviewing code, use `/code-review` and follow all instructions.
When refactoring, use `/refactor` and follow all instructions.
When evaluating code structure, use `/code-structure` and follow all instructions.
When making architecture decisions, use `/architecture-decisions` and follow all instructions.

All Python skills enforce `/tdd` — tests come first, always.

## Existing Plugins

Use available plugins for their domains (e.g., frontend-design for UI work). Skills complement plugins — they don't replace them.
