# Init Skills Report

## Project Scanned

`/Users/andrew/projects/ai-skills/init-workspace/evals/eval-1-fresh-project/project/`

## Languages Detected

| Language | Evidence |
|----------|----------|
| TypeScript | `package.json`, `tsconfig.json`, `src/index.ts` |
| Go | `go.mod`, `worker/main.go` |

## Project Structure

- **TypeScript API gateway** (`src/`) — Express-based, targeting ES2022
- **Go worker** (`worker/`) — module `github.com/example/worker`, Go 1.22

## Skills Routed

| Skill | Reason |
|-------|--------|
| `/debug` | Universal — debugging methodology |
| `/tdd` | Universal — enforced by all language writers |
| `/code-structure` | Universal — file/directory placement |
| `/refactor` | Universal — refactoring methodology |
| `/architecture-decisions` | Universal — architecture decision process |
| `/code-review` | Universal — code review methodology |
| `/ts:writer` | TypeScript detected in project |
| `/go:writer` | Go detected in project |

## Skills Not Routed

| Skill | Reason |
|-------|--------|
| `/py:writer` | No Python files or config detected |
| `/rs:writer` | No Rust files or config detected |

## CLAUDE.md Structure

Built from `base.md` template with TypeScript and Go language sections appended. Universal skills (`/debug`, `/code-review`, `/architecture-decisions`, `/refactor`, `/code-structure`) are routed in the base section. Language-specific writers are routed in their respective sections.
