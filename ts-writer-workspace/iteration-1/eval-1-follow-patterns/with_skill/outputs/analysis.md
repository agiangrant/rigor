# ProjectService Analysis

## Patterns Identified

### Error Handling
- Custom error class hierarchy: `AppError` base class with `code` and `statusCode` properties
- Domain-specific subclasses: `NotFoundError(resource, id)`, `ValidationError(message)`, `ConflictError(message)`
- Errors are thrown (not returned as Result types)
- Validation errors thrown before any db interaction; conflict errors after checking existing records

### Data Modeling
- TypeScript `interface` for entity types (not classes, not Zod)
- Separate `Create*Input` interface for write operations (only writable fields, no id/createdAt)
- Entity interfaces are local to the service file (not exported from a shared types module)

### Service Structure
- Class-based services (`export class UserService`)
- Methods are `async`, return `Promise<T>`
- No constructor injection -- services import `db` directly from `'../db'`
- No base class or shared service abstraction

### Database Layer
- `db` object exported from `../db` with entity-namespaced methods
- The `db.projects` namespace already exists with: `findById`, `findByUserId`, `create`, `update`, `delete`
- Methods accept simple parameters (id as string, data as any)

### Test Patterns
- Vitest with `describe/it/expect/vi`
- `vi.mock('../db')` at module level to mock the db
- Service instantiated once at describe scope: `const service = new UserService()`
- `beforeEach(() => vi.clearAllMocks())`
- Tests grouped by method in nested `describe` blocks
- Mock setup: `vi.mocked(db.entity.method).mockResolvedValue(...)`
- Assertion style: `expect(...).rejects.toThrow(ErrorClass)` for errors, direct property checks for success
- Uses `expect.objectContaining(...)` to verify db calls

### Naming Conventions
- camelCase for methods and variables
- PascalCase for types, interfaces, classes
- Service named after entity: `UserService` for users
- File named after service: `userService.ts`

### Module Structure
- Services in `src/services/`
- Tests in `src/__tests__/`
- Test files named `<serviceName>.test.ts`
- Errors in `src/errors/index.ts` (barrel export)

## Decisions Made

### No new patterns needed
Every pattern required for `ProjectService` already exists in the codebase:
- Error handling: use existing `NotFoundError`, `ValidationError` (no new error classes needed)
- Service shape: class with async methods, same as `UserService`
- DB access: use existing `db.projects` namespace
- Testing: same mock/assert patterns as `userService.test.ts`

### Status modeling
`status` is a constrained string -- using a union type `'active' | 'archived'` rather than an enum, consistent with the lightweight interface-based data modeling already in use. No Zod or runtime validation library exists in the project.

### Archive behavior
"Archive a project" is modeled as an `archive(id)` method that sets `status` to `'archived'` via `db.projects.update`. This is a dedicated method rather than using generic `update()` because archiving is a named domain operation. The generic `update()` also exists for updating name/description.

### Validation rules
- `name`: must be non-empty after trimming (matches UserService's name validation)
- `description`: must be a string (can be empty -- descriptions are optional content)
- `ownerId`: must be non-empty (referential integrity to users)
- `status`: defaults to `'active'` on create, only `'active'` or `'archived'` allowed on update

### What update() allows
`update()` accepts partial changes to `name` and `description` only. Status changes go through `archive()`. `ownerId` is immutable after creation. This prevents accidental status or ownership changes through the generic update path.
