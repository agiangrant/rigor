# Pattern Analysis: eval-1-follow-patterns project

## Observed Patterns

### Project Structure
- `src/db.ts` — Fake database layer with typed table objects, each exposing async CRUD methods returning `any`
- `src/errors/index.ts` — Error hierarchy: `AppError` base class with `code` and `statusCode`, plus `NotFoundError`, `ValidationError`, `ConflictError` subclasses
- `src/services/userService.ts` — Service class with async methods, imports `db` and error classes
- `src/__tests__/userService.test.ts` — Vitest tests with `vi.mock('../db')`, `vi.mocked()` for type-safe mocks, `vi.clearAllMocks()` in `beforeEach`

### Service Patterns (from UserService)
- Interface for the domain entity (e.g., `User`) defined at the top of the service file
- Separate `Create*Input` interface for creation payloads (no `id`, no `createdAt`)
- Class-based service (no constructor dependencies — imports `db` directly)
- `getById` throws `NotFoundError` when record is null
- `create` validates inputs first (throws `ValidationError`), checks for conflicts (throws `ConflictError`), then delegates to `db`
- Input sanitization: trimming strings, lowercasing emails
- `list` returns the full array from `db`

### Test Patterns
- `vi.mock('../db')` at module level (auto-mocks the entire module)
- Service instantiated once at describe scope: `const service = new UserService()`
- `beforeEach(() => vi.clearAllMocks())`
- Nested `describe` blocks per method
- Happy path first, then error cases
- Uses `vi.mocked(db.table.method).mockResolvedValue(...)` for setup
- Uses `expect(...).rejects.toThrow(ErrorClass)` for error assertions
- Uses `expect.objectContaining(...)` to verify db call arguments

### DB Layer Patterns
- `db.projects` already exists with: `findById`, `findByUserId`, `create`, `update`, `delete`
- Methods accept `(id, data)` for update, `(data)` for create, `(id)` for delete/find

## Implementation Plan for ProjectService

### Entity: Project
- `id: string`
- `name: string`
- `description: string`
- `ownerId: string` (references User)
- `status: 'active' | 'archived'`
- `createdAt: Date`
- `updatedAt: Date`

### Input Types
- `CreateProjectInput`: `{ name, description, ownerId }`
- `UpdateProjectInput`: `{ name?, description? }`

### Methods
1. `create(input)` — validate name/description not empty, verify owner exists via `db.users.findById`, create with status `'active'`
2. `getById(id)` — find or throw `NotFoundError`
3. `listByOwner(ownerId)` — return `db.projects.findByUserId(ownerId)`
4. `update(id, input)` — find or throw, validate inputs, call `db.projects.update`
5. `archive(id)` — find or throw, set status to `'archived'`, call `db.projects.update`

### Validation Rules
- `name` must not be empty (trimmed)
- `description` must not be empty (trimmed)
- Owner must exist (throws `NotFoundError` for owner)
- Cannot update an archived project (throws `ValidationError`)
- Cannot archive an already-archived project (throws `ValidationError`)
