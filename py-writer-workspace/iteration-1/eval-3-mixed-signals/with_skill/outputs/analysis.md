# Analysis: Add Task Model and API

## Codebase Scan

### Established Patterns

| Aspect | Convention |
|--------|-----------|
| **Models** | One model per file in `myapp/models/`. Django ORM. `db_table` set in `Meta`. No type hints. `auto_now_add=True` for `created_at`. |
| **Serializers** | `ModelSerializer` in `myapp/serializers/`, one per file. Explicit `fields` list. `read_only_fields` for `id` and timestamps. |
| **Views** | `APIView` (not ViewSets) in `myapp/views/`. Manual CRUD. `DoesNotExist` caught with `{"error": "..."}` 404 response. `raise_exception=True` on serializer validation. |
| **Tests** | pytest with `@pytest.mark.django_db` class-based tests. `APIClient` fixture. Test file naming: `test_*.py` in `tests/`. |
| **Imports** | Absolute imports. stdlib/third-party/local grouping. |
| **Type hints** | Not used anywhere. |
| **Async** | Not used. Sync Django. |

### Pattern Decisions

All patterns for the Task model and API are established by the existing User and Project code. No new pattern decisions need to be surfaced.

Specific mappings:
- **Task model** follows `User`/`Project` pattern: one file, `db_table`, `auto_now_add` for timestamps
- **Status field**: `CharField` with `choices` -- standard Django idiom for enum-like fields. Added `max_length` matching the longest choice value.
- **ForeignKey fields**: Follow `Project.owner` pattern -- `on_delete=models.CASCADE`, explicit `related_name`
- **Timestamps**: `created_at` with `auto_now_add=True` (matches existing). Added `updated_at` with `auto_now=True` since the task spec says "timestamps" (plural) and tasks are mutable entities where tracking updates matters.
- **Serializer**: `ModelSerializer` with all fields, `read_only_fields` for `id` and timestamps
- **Views**: `APIView` with list/create and detail (get/put/delete), matching `UserListView`/`UserDetailView` pattern but extended with update and delete since tasks are mutable
- **Tests**: pytest class-based, `APIClient` fixture, `@pytest.mark.django_db`

## Output Files

| File | Maps to project path |
|------|---------------------|
| `test_tasks.py` | `tests/test_tasks.py` |
| `task_model.py` | `myapp/models/task.py` |
| `task_serializer.py` | `myapp/serializers/task.py` |
| `task_views.py` | `myapp/views/tasks.py` |
