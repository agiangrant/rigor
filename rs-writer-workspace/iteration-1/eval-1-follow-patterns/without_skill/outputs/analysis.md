# Analysis: Adding a Project Module

## Existing Patterns Observed

### Module Structure
- Single file per domain module (`user.rs`) containing model, input types, repository trait, service, and tests all in one file
- Module registered in `lib.rs` via `pub mod`
- Tests are inline (`#[cfg(test)] mod tests`) rather than in a separate file

### Model Conventions
- Fields use `String` for IDs (UUID v4 generated as string)
- `DateTime<Utc>` from chrono for timestamps
- Derives: `Debug, Clone, Serialize, Deserialize`
- No builder pattern; structs constructed directly

### Input Types
- Separate `Create*Input` structs with `Debug, Deserialize` derives
- Used for data coming in from callers; service constructs the full model

### Repository Trait
- `#[async_trait]` on the trait
- Trait bound: `Send + Sync`
- Methods return `Result<_, AppError>`
- `find_by_id` returns `Option<T>` (service maps `None` to `NotFound`)
- `find_all` returns `Vec<T>`
- `create` takes a reference to the model and returns `Result<(), AppError>`

### Service
- Generic over the repository trait: `struct FooService<R: FooRepository>`
- `new(repo: R) -> Self` constructor
- Service handles validation, conflict checks, UUID generation, and timestamp assignment
- Validation errors use `AppError::Validation`, uniqueness conflicts use `AppError::Conflict`

### Error Handling
- Shared `AppError` enum in `error.rs` with `NotFound`, `Conflict`, `Validation`, `Internal` variants
- `NotFound` includes `resource` and `id` fields

### Test Conventions
- Mock repo struct with boxed closure fields for each trait method
- `#[async_trait] impl` on the mock
- Helper `make_*` function for constructing test fixtures
- Tests use `#[tokio::test]`
- Tests cover: success path, not-found, validation errors, conflict errors

## Design Decisions for Project Module

### Model
- `Project { id, name, description, owner_id, status, created_at, updated_at }`
- `ProjectStatus` enum: `Active`, `Archived` with Serialize/Deserialize
- `updated_at` added because projects support updates (users do not)

### Input Types
- `CreateProjectInput { name, description, owner_id }` -- status defaults to Active
- `UpdateProjectInput { name: Option<String>, description: Option<String> }` -- partial update

### Repository Trait
- `find_by_id`, `find_by_owner_id` (returns Vec), `create`, `update`
- No separate `archive` at repo level; archiving is an update to status

### Service Methods
- `create` -- validates inputs, verifies owner exists (via UserRepository), sets status to Active
- `get_by_id` -- maps None to NotFound
- `list_by_owner` -- returns Vec, no error on empty
- `update` -- validates at least one field provided, fetches existing, applies changes, updates `updated_at`
- `archive` -- fetches existing, sets status to Archived, updates `updated_at`

### Owner Validation
- The service needs a `UserRepository` to verify owner_id exists on create
- This follows the pattern of services depending on repository traits
- Service becomes `ProjectService<R: ProjectRepository, U: UserRepository>`

### Tests
- Same mock pattern as users: boxed closures for each repo method
- Cover: create success, create with empty name, create with nonexistent owner, get by id, get not found, list by owner, update success, update not found, archive success, archive not found
