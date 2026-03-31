# Analysis: Adding a Project Module

## Step 1: Codebase Scan

| Concern | Established Pattern |
|---|---|
| Error handling | `thiserror` with `AppError` enum — variants: `NotFound { resource, id }`, `Conflict(String)`, `Validation(String)`, `Internal(String)` |
| Async runtime | tokio (full features) |
| Trait design | `#[async_trait]` repository traits, `Send + Sync` bounds |
| Module structure | File-per-module (`user.rs`, `error.rs`), declared in `lib.rs` |
| Serialization | `Serialize, Deserialize` on domain structs, `Deserialize` on input structs |
| Testing | `#[cfg(test)] mod tests` inline, closure-based mock repos, `#[tokio::test]`, `make_*` helper functions |
| Ownership | Owned `String` for IDs and fields, `&str` in method parameters |
| IDs | `Uuid::new_v4().to_string()` |
| Timestamps | `chrono::DateTime<Utc>` |

## Step 2: Pattern Decisions

All patterns for the Project module are already established by the User module. No new decisions needed:

- **Domain struct**: `Project` with `#[derive(Debug, Clone, Serialize, Deserialize)]` — same as `User`
- **Status enum**: `ProjectStatus` as an enum (`Active`/`Archived`) with serde derives — uses the type system to make invalid states unrepresentable (no string matching)
- **Input structs**: `CreateProjectInput`, `UpdateProjectInput` with `#[derive(Debug, Deserialize)]` — same as `CreateUserInput`
- **Repository trait**: `ProjectRepository` with `#[async_trait]` and `Send + Sync` — same shape as `UserRepository`
- **Service**: `ProjectService<R: ProjectRepository>` generic over repo — same as `UserService<R>`
- **Error reuse**: Uses existing `AppError` variants — no new error types needed
- **Tests**: Closure-based `MockProjectRepo`, `make_project` helper, inline `#[cfg(test)] mod tests` — same pattern as user tests

## Step 3: Surfacing Decisions

No decisions to surface. All patterns follow existing conventions.

## Step 4: Implementation Plan (TDD)

Tests written first for each operation:

1. `test_create_project_success` — valid input creates project with uuid and timestamp
2. `test_create_project_empty_name_returns_validation_error` — empty name rejected
3. `test_create_project_empty_description_returns_validation_error` — empty description rejected
4. `test_get_by_id_returns_project` — found project returned
5. `test_get_by_id_not_found` — missing project returns `AppError::NotFound`
6. `test_list_by_owner_returns_projects` — returns owner's projects
7. `test_list_by_owner_returns_empty_when_none` — no projects for owner returns empty vec
8. `test_update_project_success` — updates name/description on existing project
9. `test_update_project_not_found` — update on missing project returns NotFound
10. `test_archive_project_success` — sets status to Archived
11. `test_archive_project_not_found` — archive on missing project returns NotFound

## Files to Create

- `src/project.rs` — domain types, repository trait, service, tests
- `src/lib.rs` — add `pub mod project;` (shown separately since we're not modifying originals)
