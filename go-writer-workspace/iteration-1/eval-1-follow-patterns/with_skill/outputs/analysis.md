# Task Service — Analysis

## Step 1: Codebase Scan

Patterns observed in the existing `user` package:

| Aspect | Pattern |
|---|---|
| Package organization | Domain-based flat packages: `user/`, `store/` |
| Error handling | Sentinel errors (`var ErrNotFound = errors.New(...)`) with `fmt.Errorf("...: %w", err)` wrapping |
| Interface style | Defined at the consumer (e.g., `Store` interface lives in `user`, not `store`). Small — 4 methods. |
| Dependency injection | Constructor function: `NewService(s Store) *Service` |
| Naming | No stutter: `user.User`, `user.CreateInput`. Short, direct names. |
| Testing | Standard library only. Subtests via `t.Run`. Mock struct with function fields (`mockStore`). Same-package tests. |
| ID generation | `generateID()` helper using `fmt.Sprintf("prefix_%d", time.Now().UnixNano())` |
| Context | Not used in the existing code |
| Nil-check pattern | Store returns `(nil, nil)` for not-found; service checks for nil and returns sentinel error |

## Step 2: Pattern Decisions

All patterns are established. The task service follows them directly:

- **New package**: `task/` — matches the domain-based flat structure
- **Sentinel errors**: `ErrNotFound`, `ErrInvalidTitle`, `ErrInvalidStatus`, `ErrInvalidProject`
- **Store interface**: Defined inside `task` package (consumer), with methods the service needs
- **Constructor**: `NewService(s Store) *Service`
- **Input structs**: `CreateInput`, `UpdateInput`
- **Status type**: `type Status string` with constants — standard Go pattern for string enums
- **No context**: The existing code does not use `context.Context`, so neither will this

One design choice worth noting: `ChangeStatus` is a separate method from `Update`, as the task description calls it out distinctly. This keeps `Update` for field edits (title, description) and `ChangeStatus` as a focused operation — matching how status transitions are typically a separate concern from general field updates.

## Step 3: No Decisions to Surface

Every pattern follows directly from what exists. No ambiguous choices.

## Step 4: TDD

Tests written first, covering:
- Create: valid input, missing title, missing projectId
- GetByID: found, not found
- ListByProject: returns filtered results, empty project ID rejected
- Update: valid update, not found
- ChangeStatus: valid transition, invalid status, not found
