# Analysis: Adding ProjectService to FastAPI App

## Existing Patterns Observed

### Architecture
The app follows a clean layered architecture:
- **Models** (`app/models/`): Plain dataclasses, no ORM coupling
- **Repositories** (`app/repositories/`): Protocol-based interfaces (typing.Protocol), async methods
- **Services** (`app/services/`): Business logic, takes repository via constructor injection, raises domain exceptions
- **Schemas** (`app/schemas/`): Pydantic BaseModel for request/response, `from_attributes = True` on responses
- **Routes** (`app/routes/`): FastAPI APIRouter with prefix/tags, Depends for service injection, maps domain exceptions to HTTPException
- **Exceptions** (`app/exceptions.py`): Hierarchy with AppError base, NotFoundError, ConflictError, ValidationError

### Conventions
- IDs are `str` type
- Timestamps use `datetime` from stdlib
- Repository methods: `find_by_id`, `find_by_*`, `find_all`, `create` naming
- Services: `get_by_id`, `create`, `list_all` naming
- Tests: `unittest.mock.AsyncMock` for repo mocks, pytest fixtures, grouped in classes by method (TestGetById, TestCreate, etc.)
- Routes: exception handling via try/except mapping to HTTPException
- No `__init__.py` files present

## Design Decisions for ProjectService

### Model
- `Project` dataclass with: `id: str`, `name: str`, `description: str`, `owner_id: str`, `status: str`, `created_at: datetime`
- Status is a string constrained to "active" / "archived" (using a Literal or enum could work, but following the minimal dataclass pattern, a string with service-level validation is consistent)

### Repository Protocol
- `ProjectRepository` with: `find_by_id`, `find_by_owner_id`, `create`, `update`, `find_all`
- `find_by_owner_id` returns `list[Project]` for listing a user's projects

### Service
- `ProjectService` takes both `ProjectRepository` and `UserRepository` (to validate owner_id exists)
- Methods: `create`, `get_by_id`, `list_by_owner`, `update`, `archive`
- `archive` is a specialized update that sets status to "archived"
- Validates owner exists on create
- Validates project exists on get/update/archive

### Schemas
- `CreateProjectRequest`: name, description, owner_id
- `UpdateProjectRequest`: optional name, optional description
- `ProjectResponse`: all fields with from_attributes

### Routes
- Router prefix: `/projects`, tag: `projects`
- POST `/` - create
- GET `/{project_id}` - get by ID
- GET `/` with query param `owner_id` - list by owner
- PATCH `/{project_id}` - update
- POST `/{project_id}/archive` - archive

### Tests
- Mock both repos
- Test each service method: happy path + error cases
- Follow existing class-per-method grouping pattern
