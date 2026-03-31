# Analysis: Adding ProjectService

## Codebase Scan

### Patterns Identified

| Category | Convention |
|---|---|
| **Python version** | 3.12+, uses `str | None` union syntax |
| **Type hints** | Full type hints on all public methods, return types included |
| **Data modeling** | `dataclasses.dataclass` for domain models |
| **Schemas** | Pydantic v2 `BaseModel` with `model_config = {"from_attributes": True}` |
| **Error handling** | Custom exception hierarchy: `AppError` -> `NotFoundError`, `ConflictError`, `ValidationError` |
| **Async/sync** | Fully async — async service methods, async repository protocol, `asyncio_mode = "auto"` in pytest |
| **Repository** | `typing.Protocol` defining async interface, injected into service via `__init__` |
| **Service layer** | Class with `self._repo`, raises domain exceptions, no framework coupling |
| **Routes** | FastAPI `APIRouter` with `prefix`, `tags`, `Depends` for service injection, catches domain exceptions -> `HTTPException` |
| **Testing** | pytest with `AsyncMock`, fixtures for `mock_repo` and `service`, test classes grouped by operation (e.g., `TestGetById`, `TestCreate`) |
| **Imports** | Absolute imports, stdlib/third-party/local grouping |
| **Dependency management** | pyproject.toml, no build tool specified |

### Pattern Decisions

All patterns needed for ProjectService already exist in the codebase. No new pattern decisions required.

- **Status field**: Uses `enum.Enum` — standard library, consistent with the dataclass-based model approach.
- **owner_id validation**: The service validates that the owner exists via the `UserRepository`, following the same repository-protocol injection pattern.
- **Archive operation**: Modeled as a dedicated service method (not a generic update) since it has specific semantics (one-way status transition). The repository protocol includes `update` for general mutations and the service layer enforces the archive-specific business rule.

## File Plan

| File | Purpose |
|---|---|
| `app/models/project.py` | `Project` dataclass with `ProjectStatus` enum |
| `app/repositories/base.py` | Extended with `ProjectRepository` protocol |
| `app/schemas/project.py` | Pydantic request/response schemas |
| `app/services/project_service.py` | Business logic, uses both `ProjectRepository` and `UserRepository` |
| `app/routes/projects.py` | FastAPI router with CRUD + archive endpoints |
| `tests/test_project_service.py` | Service-layer tests with mocked repositories |
