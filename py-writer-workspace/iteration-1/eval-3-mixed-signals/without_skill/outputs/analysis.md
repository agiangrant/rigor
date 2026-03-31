# Analysis: Adding Task Model and API

## Existing Project Structure

The project is a Django REST Framework application with:

- **Models**: `User` (email, name, created_at) and `Project` (name, owner FK to User, created_at) in separate files under `myapp/models/`
- **Serializers**: `UserSerializer` as a `ModelSerializer` in `myapp/serializers/user.py`
- **Views**: `UserListView` and `UserDetailView` as class-based `APIView`s in `myapp/views/users.py`
- **Tests**: pytest-based with `APIClient`, using `@pytest.mark.django_db` in `tests/test_users.py`

## Observations and Style Conventions

1. **Models use separate files** per entity under `myapp/models/`, not a single `models.py`
2. **String-based FK references** (`"User"`) used in the Project model rather than importing the model class
3. **`db_table` is explicitly set** in `Meta` classes (e.g., `"users"`, `"projects"`)
4. **Views are plain `APIView`** subclasses, not `ModelViewSet` or generic views
5. **Error handling** uses manual try/except with custom error dicts, not DRF's built-in 404 handling
6. **Tests** use pytest fixtures, `APIClient`, and `@pytest.mark.django_db` class decorator
7. **No `__init__.py` files** are present in the project source (or at least not tracked)
8. **No URL configuration file** is present in the source; tests assume `/api/users/` URL pattern
9. **Serializer uses `read_only_fields`** for `id` and `created_at`

## Design Decisions

### Status Field
Using `CharField` with `choices` rather than an `IntegerField` enum. This matches DRF convention where string values serialize cleanly and are self-documenting in API responses. The choices are `todo`, `in_progress`, and `done`.

### View Style
Following the existing `APIView` pattern with manual queryset handling and try/except for 404s, rather than switching to `ModelViewSet` which would be inconsistent with the codebase.

### Serializer Validation
The serializer validates the `status` field via the model's `choices` constraint. The `assigned_to` and `project` ForeignKey fields use DRF's default `PrimaryKeyRelatedField` behavior from `ModelSerializer`.

### URL Pattern
Following the existing convention, tasks will be at `/api/tasks/` with detail at `/api/tasks/<pk>/`.

### Test Coverage
Tests cover:
- Listing tasks (empty and populated)
- Creating a valid task
- Creating a task with invalid status
- Creating a task without required fields
- Retrieving a single task by PK
- Retrieving a nonexistent task (404)
- Filtering tasks by status, assigned_to, and project (if implemented)

## Files to Create

| File | Purpose |
|------|---------|
| `myapp/models/task.py` | Task model definition |
| `myapp/serializers/task.py` | Task serializer |
| `myapp/views/tasks.py` | TaskListView and TaskDetailView |
| `tests/test_tasks.py` | Full test suite for Task API |
